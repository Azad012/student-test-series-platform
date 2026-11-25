/**
 * Grades an attempt against its test_series marking scheme and persists results.
 */
function finalizeAttempt(db, attemptId, status = 'submitted') {
  const attempt = db.prepare('SELECT * FROM attempts WHERE id = ?').get(attemptId);
  if (!attempt) return null;

  if (attempt.status !== 'in_progress') {
    return attempt;
  }

  const test = db.prepare('SELECT * FROM test_series WHERE id = ?').get(attempt.test_id);
  const questions = db
    .prepare('SELECT * FROM questions WHERE test_id = ? ORDER BY order_index ASC, id ASC')
    .all(attempt.test_id);
  const existingAnswers = db
    .prepare('SELECT * FROM attempt_answers WHERE attempt_id = ?')
    .all(attemptId);

  const answerMap = new Map(existingAnswers.map((a) => [a.question_id, a]));
  const marksCorrect = Number(test.marks_correct ?? 1);
  const negativeMarks = Number(test.negative_marks ?? 0);

  let attemptedCount = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let unattemptedCount = 0;
  let score = 0;
  const totalQuestions = questions.length;
  const maxScore = Number((totalQuestions * marksCorrect).toFixed(2));
  const nowIso = new Date().toISOString();

  const upsertAnswer = db.prepare(`
    INSERT INTO attempt_answers (attempt_id, question_id, selected_option, is_marked_for_review, is_visited, is_correct, marks_awarded, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(attempt_id, question_id) DO UPDATE SET
      is_correct = excluded.is_correct,
      marks_awarded = excluded.marks_awarded,
      updated_at = excluded.updated_at
  `);

  db.exec('BEGIN');
  try {
    for (const q of questions) {
      const ans = answerMap.get(q.id);
      const selected = ans?.selected_option || null;
      let isCorrect = null;
      let marksAwarded = 0;

      if (!selected) {
        unattemptedCount += 1;
      } else {
        attemptedCount += 1;
        if (selected === q.correct_option) {
          isCorrect = 1;
          correctCount += 1;
          marksAwarded = marksCorrect;
          score += marksCorrect;
        } else {
          isCorrect = 0;
          wrongCount += 1;
          marksAwarded = -negativeMarks;
          score -= negativeMarks;
        }
      }

      upsertAnswer.run(
        attemptId,
        q.id,
        selected,
        ans ? ans.is_marked_for_review : 0,
        ans ? ans.is_visited : 0,
        isCorrect,
        Number(marksAwarded.toFixed(2)),
        nowIso
      );
    }

    score = Number(score.toFixed(2));
    const accuracy = attemptedCount > 0 ? Number(((correctCount / attemptedCount) * 100).toFixed(1)) : 0;

    const startedMs = new Date(attempt.started_at).getTime();
    const expiresMs = new Date(attempt.expires_at).getTime();
    const endedMs = status === 'auto_submitted' ? Math.min(Date.now(), expiresMs) : Math.min(Date.now(), expiresMs);
    const timeTakenSeconds = Math.max(0, Math.round((endedMs - startedMs) / 1000));

    db.prepare(`
      UPDATE attempts
      SET status = ?,
          submitted_at = ?,
          total_questions = ?,
          attempted_count = ?,
          correct_count = ?,
          wrong_count = ?,
          unattempted_count = ?,
          score = ?,
          max_score = ?,
          accuracy = ?,
          time_taken_seconds = ?
      WHERE id = ?
    `).run(
      status,
      nowIso,
      totalQuestions,
      attemptedCount,
      correctCount,
      wrongCount,
      unattemptedCount,
      score,
      maxScore,
      accuracy,
      timeTakenSeconds,
      attemptId
    );
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return db.prepare('SELECT * FROM attempts WHERE id = ?').get(attemptId);
}

function isAttemptExpired(attempt) {
  if (!attempt || attempt.status !== 'in_progress') return false;
  return Date.now() >= new Date(attempt.expires_at).getTime();
}

module.exports = {
  finalizeAttempt,
  isAttemptExpired,
};
