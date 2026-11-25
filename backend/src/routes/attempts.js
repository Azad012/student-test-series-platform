const express = require('express');
const { getDb } = require('../db');
const { authenticate, requireRole } = require('../utils/auth');
const { finalizeAttempt, isAttemptExpired } = require('../utils/grading');

const router = express.Router();

// Start or resume an attempt for a test
router.post('/tests/:testId/start', authenticate, requireRole('student'), (req, res) => {
  const testId = Number(req.params.testId);
  const db = getDb();

  const test = db
    .prepare(
      `SELECT t.*, c.is_published AS course_published, c.is_self_enroll
       FROM test_series t
       JOIN courses c ON c.id = t.course_id
       WHERE t.id = ?`
    )
    .get(testId);

  if (!test || !test.is_published || !test.course_published) {
    return res.status(404).json({ error: 'Test series not found or unavailable' });
  }

  const enrollment = db
    .prepare('SELECT * FROM course_enrollments WHERE course_id = ? AND student_id = ?')
    .get(test.course_id, req.user.id);

  if (!enrollment) {
    return res.status(403).json({ error: 'Please enroll in this course before taking the test' });
  }

  const questions = db
    .prepare(
      `SELECT id, order_index, subject, question_text, option_a, option_b, option_c, option_d
       FROM questions
       WHERE test_id = ?
       ORDER BY order_index ASC, id ASC`
    )
    .all(testId);

  if (questions.length === 0) {
    return res.status(400).json({ error: 'This test does not have any questions yet' });
  }

  // Check existing in_progress attempt
  let attempt = db
    .prepare("SELECT * FROM attempts WHERE test_id = ? AND student_id = ? AND status = 'in_progress' ORDER BY id DESC LIMIT 1")
    .get(testId, req.user.id);

  if (attempt && isAttemptExpired(attempt)) {
    finalizeAttempt(db, attempt.id, 'auto_submitted');
    attempt = null;
  }

  if (!attempt) {
    if (!test.allow_multiple_attempts) {
      const prior = db
        .prepare("SELECT id FROM attempts WHERE test_id = ? AND student_id = ? AND status != 'in_progress'")
        .get(testId, req.user.id);
      if (prior) {
        return res.status(403).json({ error: 'Multiple attempts are not allowed for this test' });
      }
    }

    const startedMs = Date.now();
    const expiresMs = startedMs + test.duration_minutes * 60 * 1000;
    const info = db
      .prepare(
        `INSERT INTO attempts (test_id, student_id, status, started_at, expires_at, total_questions, max_score)
         VALUES (?, ?, 'in_progress', ?, ?, ?, ?)`
      )
      .run(
        testId,
        req.user.id,
        new Date(startedMs).toISOString(),
        new Date(expiresMs).toISOString(),
        questions.length,
        Number((questions.length * Number(test.marks_correct)).toFixed(2))
      );

    attempt = db.prepare('SELECT * FROM attempts WHERE id = ?').get(info.lastInsertRowid);
  }

  const savedAnswers = db
    .prepare(
      `SELECT question_id, selected_option, is_marked_for_review, is_visited
       FROM attempt_answers
       WHERE attempt_id = ?`
    )
    .all(attempt.id);

  const remainingSeconds = Math.max(
    0,
    Math.floor((new Date(attempt.expires_at).getTime() - Date.now()) / 1000)
  );

  return res.json({
    attempt,
    test: {
      id: test.id,
      course_id: test.course_id,
      title: test.title,
      description: test.description,
      duration_minutes: test.duration_minutes,
      marks_correct: test.marks_correct,
      negative_marks: test.negative_marks,
    },
    remainingSeconds,
    questions,
    savedAnswers,
  });
});

// Save answer / mark for review / visited status during exam
router.put('/:attemptId/answer', authenticate, requireRole('student'), (req, res) => {
  const attemptId = Number(req.params.attemptId);
  const { questionId, selectedOption = null, isMarkedForReview = false, isVisited = true } = req.body || {};
  const db = getDb();

  const attempt = db.prepare('SELECT * FROM attempts WHERE id = ? AND student_id = ?').get(attemptId, req.user.id);
  if (!attempt) {
    return res.status(404).json({ error: 'Attempt not found' });
  }
  if (attempt.status !== 'in_progress') {
    return res.status(409).json({ error: 'Attempt has already been submitted', attempt });
  }
  if (isAttemptExpired(attempt)) {
    const finalized = finalizeAttempt(db, attempt.id, 'auto_submitted');
    return res.status(409).json({ error: 'Time expired; attempt was auto-submitted', expired: true, attempt: finalized });
  }

  const question = db
    .prepare('SELECT id FROM questions WHERE id = ? AND test_id = ?')
    .get(Number(questionId), attempt.test_id);
  if (!question) {
    return res.status(400).json({ error: 'Question does not belong to this test' });
  }

  const cleanOption =
    selectedOption === null || selectedOption === undefined || selectedOption === ''
      ? null
      : String(selectedOption).toUpperCase();

  if (cleanOption !== null && !['A', 'B', 'C', 'D'].includes(cleanOption)) {
    return res.status(400).json({ error: 'selectedOption must be A, B, C, D, or null' });
  }

  const nowIso = new Date().toISOString();
  db.prepare(
    `INSERT INTO attempt_answers (attempt_id, question_id, selected_option, is_marked_for_review, is_visited, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(attempt_id, question_id) DO UPDATE SET
       selected_option = excluded.selected_option,
       is_marked_for_review = excluded.is_marked_for_review,
       is_visited = excluded.is_visited,
       updated_at = excluded.updated_at`
  ).run(attemptId, question.id, cleanOption, isMarkedForReview ? 1 : 0, isVisited ? 1 : 0, nowIso);

  const remainingSeconds = Math.max(
    0,
    Math.floor((new Date(attempt.expires_at).getTime() - Date.now()) / 1000)
  );

  return res.json({ saved: true, remainingSeconds });
});

// Submit attempt and compute final marks
router.post('/:attemptId/submit', authenticate, requireRole('student'), (req, res) => {
  const attemptId = Number(req.params.attemptId);
  const db = getDb();
  const attempt = db.prepare('SELECT * FROM attempts WHERE id = ? AND student_id = ?').get(attemptId, req.user.id);
  if (!attempt) {
    return res.status(404).json({ error: 'Attempt not found' });
  }

  // Optional batch sync of final answers in submit payload
  const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
  if (attempt.status === 'in_progress' && answers.length > 0) {
    const nowIso = new Date().toISOString();
    const upsert = db.prepare(
      `INSERT INTO attempt_answers (attempt_id, question_id, selected_option, is_marked_for_review, is_visited, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(attempt_id, question_id) DO UPDATE SET
         selected_option = excluded.selected_option,
         is_marked_for_review = excluded.is_marked_for_review,
         is_visited = excluded.is_visited,
         updated_at = excluded.updated_at`
    );
    db.exec('BEGIN');
    try {
      for (const item of answers) {
        const cleanOption =
          item.selectedOption === null || item.selectedOption === undefined || item.selectedOption === ''
            ? null
            : String(item.selectedOption).toUpperCase();
        if (cleanOption !== null && !['A', 'B', 'C', 'D'].includes(cleanOption)) continue;
        upsert.run(
          attemptId,
          Number(item.questionId),
          cleanOption,
          item.isMarkedForReview ? 1 : 0,
          item.isVisited ? 1 : 0,
          nowIso
        );
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }

  const mode = req.body?.autoSubmitted || isAttemptExpired(attempt) ? 'auto_submitted' : 'submitted';
  const graded = finalizeAttempt(db, attemptId, mode);
  return res.json({ attempt: graded });
});

// Get full detailed result and Q&A review for an attempt
router.get('/:attemptId/result', authenticate, (req, res) => {
  const attemptId = Number(req.params.attemptId);
  const db = getDb();

  let attempt = db.prepare('SELECT * FROM attempts WHERE id = ?').get(attemptId);
  if (!attempt) {
    return res.status(404).json({ error: 'Attempt not found' });
  }
  if (req.user.role !== 'admin' && attempt.student_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (attempt.status === 'in_progress') {
    if (isAttemptExpired(attempt)) {
      attempt = finalizeAttempt(db, attempt.id, 'auto_submitted');
    } else {
      return res.status(400).json({ error: 'Attempt is still in progress. Submit it first to view answers.' });
    }
  }

  const test = db
    .prepare(
      `SELECT t.*, c.title AS course_title, c.category AS course_category
       FROM test_series t
       JOIN courses c ON c.id = t.course_id
       WHERE t.id = ?`
    )
    .get(attempt.test_id);

  const student = db
    .prepare('SELECT id, name, email FROM users WHERE id = ?')
    .get(attempt.student_id);

  const reviewRows = db
    .prepare(
      `SELECT q.id, q.order_index, q.subject, q.question_text,
              q.option_a, q.option_b, q.option_c, q.option_d,
              q.correct_option, q.explanation,
              aa.selected_option, aa.is_marked_for_review, aa.is_visited,
              aa.is_correct, COALESCE(aa.marks_awarded, 0) AS marks_awarded
       FROM questions q
       LEFT JOIN attempt_answers aa ON aa.question_id = q.id AND aa.attempt_id = ?
       WHERE q.test_id = ?
       ORDER BY q.order_index ASC, q.id ASC`
    )
    .all(attemptId, attempt.test_id);

  // Subject-wise breakdown
  const subjectMap = new Map();
  for (const row of reviewRows) {
    const subj = row.subject || 'General';
    if (!subjectMap.has(subj)) {
      subjectMap.set(subj, {
        subject: subj,
        total: 0,
        attempted: 0,
        correct: 0,
        wrong: 0,
        unattempted: 0,
        marks: 0,
        maxMarks: 0,
      });
    }
    const entry = subjectMap.get(subj);
    entry.total += 1;
    entry.maxMarks = Number((entry.maxMarks + Number(test.marks_correct)).toFixed(2));
    if (!row.selected_option) {
      entry.unattempted += 1;
    } else {
      entry.attempted += 1;
      if (row.is_correct === 1) entry.correct += 1;
      else entry.wrong += 1;
    }
    entry.marks = Number((entry.marks + Number(row.marks_awarded || 0)).toFixed(2));
  }

  const subjectBreakdown = Array.from(subjectMap.values()).map((s) => ({
    ...s,
    accuracy: s.attempted > 0 ? Number(((s.correct / s.attempted) * 100).toFixed(1)) : 0,
  }));

  return res.json({
    attempt,
    test,
    student,
    subjectBreakdown,
    questions: reviewRows,
  });
});

module.exports = router;
