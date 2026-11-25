const express = require('express');
const { getDb } = require('../db');
const { authenticate, requireRole } = require('../utils/auth');
const { normalizeQuestionRecord, parseBulkQuestions } = require('../utils/csv');
const { finalizeAttempt, isAttemptExpired } = require('../utils/grading');

const router = express.Router();

// List tests in a course
router.get('/course/:courseId', authenticate, (req, res) => {
  const courseId = Number(req.params.courseId);
  const db = getDb();
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  if (req.user.role === 'admin') {
    const tests = db
      .prepare(`
        SELECT t.*,
               (SELECT COUNT(*) FROM questions q WHERE q.test_id = t.id) AS question_count,
               (SELECT COUNT(*) FROM attempts a WHERE a.test_id = t.id AND a.status != 'in_progress') AS attempt_count
        FROM test_series t
        WHERE t.course_id = ?
        ORDER BY t.id DESC
      `)
      .all(courseId);
    return res.json({ course, tests });
  }

  const enrollment = db
    .prepare('SELECT * FROM course_enrollments WHERE course_id = ? AND student_id = ?')
    .get(courseId, req.user.id);

  if (!course.is_published || (!course.is_self_enroll && !enrollment)) {
    return res.status(403).json({ error: 'You do not have access to this course' });
  }

  const tests = db
    .prepare(`
      SELECT t.*,
             (SELECT COUNT(*) FROM questions q WHERE q.test_id = t.id) AS question_count
      FROM test_series t
      WHERE t.course_id = ? AND t.is_published = 1
      ORDER BY t.id ASC
    `)
    .all(courseId);

  // Auto-finalize any expired in-progress attempts for this student
  const openAttempts = db
    .prepare("SELECT * FROM attempts WHERE student_id = ? AND status = 'in_progress'")
    .all(req.user.id);
  for (const att of openAttempts) {
    if (isAttemptExpired(att)) {
      finalizeAttempt(db, att.id, 'auto_submitted');
    }
  }

  const enrichedTests = tests.map((t) => {
    const latestAttempt = db
      .prepare(
        `SELECT id, status, score, max_score, accuracy, correct_count, wrong_count, submitted_at, started_at, expires_at
         FROM attempts
         WHERE test_id = ? AND student_id = ?
         ORDER BY id DESC
         LIMIT 1`
      )
      .get(t.id, req.user.id);

    const bestAttempt = db
      .prepare(
        `SELECT id, score, max_score, accuracy
         FROM attempts
         WHERE test_id = ? AND student_id = ? AND status != 'in_progress'
         ORDER BY score DESC, id DESC
         LIMIT 1`
      )
      .get(t.id, req.user.id);

    return {
      ...t,
      latest_attempt: latestAttempt || null,
      best_attempt: bestAttempt || null,
    };
  });

  return res.json({
    course: { ...course, is_enrolled: enrollment ? 1 : 0 },
    tests: enrichedTests,
  });
});

// Create test under a course (admin)
router.post('/course/:courseId', authenticate, requireRole('admin'), (req, res) => {
  const courseId = Number(req.params.courseId);
  const db = getDb();
  const course = db.prepare('SELECT id FROM courses WHERE id = ?').get(courseId);
  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  const {
    title,
    description = '',
    duration_minutes = 100,
    marks_correct = 1,
    negative_marks = 0,
    is_published = true,
    allow_multiple_attempts = true,
  } = req.body || {};

  const cleanTitle = String(title || '').trim();
  const duration = Number(duration_minutes);
  const marksCorrect = Number(marks_correct);
  const negMarks = Number(negative_marks);

  if (!cleanTitle) {
    return res.status(400).json({ error: 'Test title is required' });
  }
  if (!Number.isFinite(duration) || duration <= 0) {
    return res.status(400).json({ error: 'duration_minutes must be a positive number' });
  }
  if (!Number.isFinite(marksCorrect) || marksCorrect <= 0) {
    return res.status(400).json({ error: 'marks_correct must be a positive number' });
  }
  if (!Number.isFinite(negMarks) || negMarks < 0) {
    return res.status(400).json({ error: 'negative_marks cannot be negative' });
  }

  const nowIso = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO test_series
       (course_id, title, description, duration_minutes, marks_correct, negative_marks, is_published, allow_multiple_attempts, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      courseId,
      cleanTitle,
      String(description || '').trim(),
      Math.round(duration),
      marksCorrect,
      negMarks,
      is_published ? 1 : 0,
      allow_multiple_attempts ? 1 : 0,
      nowIso
    );

  const test = db.prepare('SELECT * FROM test_series WHERE id = ?').get(info.lastInsertRowid);
  return res.status(201).json({ test });
});

router.put('/:testId', authenticate, requireRole('admin'), (req, res) => {
  const testId = Number(req.params.testId);
  const db = getDb();
  const existing = db.prepare('SELECT * FROM test_series WHERE id = ?').get(testId);
  if (!existing) {
    return res.status(404).json({ error: 'Test not found' });
  }

  const {
    title = existing.title,
    description = existing.description,
    duration_minutes = existing.duration_minutes,
    marks_correct = existing.marks_correct,
    negative_marks = existing.negative_marks,
    is_published = existing.is_published,
    allow_multiple_attempts = existing.allow_multiple_attempts,
  } = req.body || {};

  const cleanTitle = String(title || '').trim();
  const duration = Number(duration_minutes);
  const marksCorrect = Number(marks_correct);
  const negMarks = Number(negative_marks);

  if (!cleanTitle || duration <= 0 || marksCorrect <= 0 || negMarks < 0) {
    return res.status(400).json({ error: 'Invalid test settings' });
  }

  db.prepare(
    `UPDATE test_series
     SET title = ?, description = ?, duration_minutes = ?, marks_correct = ?, negative_marks = ?, is_published = ?, allow_multiple_attempts = ?
     WHERE id = ?`
  ).run(
    cleanTitle,
    String(description || '').trim(),
    Math.round(duration),
    marksCorrect,
    negMarks,
    is_published ? 1 : 0,
    allow_multiple_attempts ? 1 : 0,
    testId
  );

  const test = db.prepare('SELECT * FROM test_series WHERE id = ?').get(testId);
  return res.json({ test });
});

router.delete('/:testId', authenticate, requireRole('admin'), (req, res) => {
  const testId = Number(req.params.testId);
  const db = getDb();
  const info = db.prepare('DELETE FROM test_series WHERE id = ?').run(testId);
  if (info.changes === 0) {
    return res.status(404).json({ error: 'Test not found' });
  }
  return res.json({ deleted: true });
});

// Admin: list questions for a test
router.get('/:testId/questions', authenticate, requireRole('admin'), (req, res) => {
  const testId = Number(req.params.testId);
  const db = getDb();
  const test = db.prepare('SELECT * FROM test_series WHERE id = ?').get(testId);
  if (!test) {
    return res.status(404).json({ error: 'Test not found' });
  }
  const questions = db
    .prepare('SELECT * FROM questions WHERE test_id = ? ORDER BY order_index ASC, id ASC')
    .all(testId);
  return res.json({ test, questions });
});

// Admin: add single question
router.post('/:testId/questions', authenticate, requireRole('admin'), (req, res) => {
  const testId = Number(req.params.testId);
  const db = getDb();
  const test = db.prepare('SELECT id FROM test_series WHERE id = ?').get(testId);
  if (!test) {
    return res.status(404).json({ error: 'Test not found' });
  }

  const normalized = normalizeQuestionRecord(req.body || {}, 0);
  if (normalized.error) {
    return res.status(400).json({ error: normalized.error });
  }

  const maxRow = db
    .prepare('SELECT COALESCE(MAX(order_index), 0) AS max_idx FROM questions WHERE test_id = ?')
    .get(testId);
  const nextIndex = (maxRow?.max_idx || 0) + 1;

  const r = normalized.record;
  const info = db
    .prepare(
      `INSERT INTO questions
       (test_id, order_index, subject, question_text, option_a, option_b, option_c, option_d, correct_option, explanation)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      testId,
      nextIndex,
      r.subject,
      r.question_text,
      r.option_a,
      r.option_b,
      r.option_c,
      r.option_d,
      r.correct_option,
      r.explanation
    );

  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(info.lastInsertRowid);
  return res.status(201).json({ question });
});

// Admin: bulk import questions (CSV or JSON)
router.post('/:testId/questions/import', authenticate, requireRole('admin'), (req, res) => {
  const testId = Number(req.params.testId);
  const db = getDb();
  const test = db.prepare('SELECT id FROM test_series WHERE id = ?').get(testId);
  if (!test) {
    return res.status(404).json({ error: 'Test not found' });
  }

  const { format = 'json', data } = req.body || {};
  const { valid, errors } = parseBulkQuestions(String(format).toLowerCase(), data);

  if (valid.length === 0) {
    return res.status(400).json({ error: 'No valid questions found to import', errors });
  }

  const maxRow = db
    .prepare('SELECT COALESCE(MAX(order_index), 0) AS max_idx FROM questions WHERE test_id = ?')
    .get(testId);
  let nextIndex = (maxRow?.max_idx || 0) + 1;

  const insertStmt = db.prepare(
    `INSERT INTO questions
     (test_id, order_index, subject, question_text, option_a, option_b, option_c, option_d, correct_option, explanation)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  db.exec('BEGIN');
  try {
    for (const r of valid) {
      insertStmt.run(
        testId,
        nextIndex,
        r.subject,
        r.question_text,
        r.option_a,
        r.option_b,
        r.option_c,
        r.option_d,
        r.correct_option,
        r.explanation
      );
      nextIndex += 1;
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return res.status(201).json({
    importedCount: valid.length,
    errorCount: errors.length,
    errors,
  });
});

// Admin: update or delete a specific question
router.put('/questions/:questionId', authenticate, requireRole('admin'), (req, res) => {
  const questionId = Number(req.params.questionId);
  const db = getDb();
  const existing = db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId);
  if (!existing) {
    return res.status(404).json({ error: 'Question not found' });
  }

  const merged = {
    subject: req.body?.subject ?? existing.subject,
    question_text: req.body?.question_text ?? existing.question_text,
    option_a: req.body?.option_a ?? existing.option_a,
    option_b: req.body?.option_b ?? existing.option_b,
    option_c: req.body?.option_c ?? existing.option_c,
    option_d: req.body?.option_d ?? existing.option_d,
    correct_option: req.body?.correct_option ?? existing.correct_option,
    explanation: req.body?.explanation ?? existing.explanation,
  };

  const normalized = normalizeQuestionRecord(merged, 0);
  if (normalized.error) {
    return res.status(400).json({ error: normalized.error });
  }

  const r = normalized.record;
  db.prepare(
    `UPDATE questions
     SET subject = ?, question_text = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?, correct_option = ?, explanation = ?
     WHERE id = ?`
  ).run(
    r.subject,
    r.question_text,
    r.option_a,
    r.option_b,
    r.option_c,
    r.option_d,
    r.correct_option,
    r.explanation,
    questionId
  );

  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId);
  return res.json({ question });
});

router.delete('/questions/:questionId', authenticate, requireRole('admin'), (req, res) => {
  const questionId = Number(req.params.questionId);
  const db = getDb();
  const info = db.prepare('DELETE FROM questions WHERE id = ?').run(questionId);
  if (info.changes === 0) {
    return res.status(404).json({ error: 'Question not found' });
  }
  return res.json({ deleted: true });
});

module.exports = router;
