const express = require('express');
const { getDb } = require('../db');
const { authenticate, requireRole } = require('../utils/auth');
const { finalizeAttempt, isAttemptExpired } = require('../utils/grading');

const router = express.Router();

router.get('/dashboard', authenticate, requireRole('student'), (req, res) => {
  const db = getDb();

  // Auto-finalize any expired in-progress attempts before reporting analytics
  const openAttempts = db
    .prepare("SELECT * FROM attempts WHERE student_id = ? AND status = 'in_progress'")
    .all(req.user.id);
  for (const att of openAttempts) {
    if (isAttemptExpired(att)) {
      finalizeAttempt(db, att.id, 'auto_submitted');
    }
  }

  const attempts = db
    .prepare(`
      SELECT a.*, t.title AS test_title, t.duration_minutes, t.marks_correct, t.negative_marks,
             c.id AS course_id, c.title AS course_title, c.category AS course_category
      FROM attempts a
      JOIN test_series t ON t.id = a.test_id
      JOIN courses c ON c.id = t.course_id
      WHERE a.student_id = ? AND a.status != 'in_progress'
      ORDER BY a.submitted_at DESC, a.id DESC
    `)
    .all(req.user.id);

  const totalTestsTaken = attempts.length;
  let totalCorrect = 0;
  let totalWrong = 0;
  let totalAttempted = 0;
  let totalUnattempted = 0;
  let sumScorePct = 0;
  let bestScorePercent = 0;

  for (const a of attempts) {
    totalCorrect += a.correct_count;
    totalWrong += a.wrong_count;
    totalAttempted += a.attempted_count;
    totalUnattempted += a.unattempted_count;
    const pct = a.max_score > 0 ? Math.max(0, (a.score / a.max_score) * 100) : 0;
    sumScorePct += pct;
    if (pct > bestScorePercent) bestScorePercent = pct;
  }

  const averageScorePercent = totalTestsTaken > 0 ? Number((sumScorePct / totalTestsTaken).toFixed(1)) : 0;
  const averageAccuracy = totalAttempted > 0 ? Number(((totalCorrect / totalAttempted) * 100).toFixed(1)) : 0;

  // Subject breakdown across all submitted attempts
  const subjectRows = db
    .prepare(`
      SELECT q.subject,
             COUNT(*) AS total_questions,
             SUM(CASE WHEN aa.selected_option IS NOT NULL THEN 1 ELSE 0 END) AS attempted,
             SUM(CASE WHEN aa.is_correct = 1 THEN 1 ELSE 0 END) AS correct,
             SUM(CASE WHEN aa.is_correct = 0 THEN 1 ELSE 0 END) AS wrong,
             SUM(COALESCE(aa.marks_awarded, 0)) AS marks_earned
      FROM attempts a
      JOIN questions q ON q.test_id = a.test_id
      LEFT JOIN attempt_answers aa ON aa.attempt_id = a.id AND aa.question_id = q.id
      WHERE a.student_id = ? AND a.status != 'in_progress'
      GROUP BY q.subject
      ORDER BY attempted DESC, q.subject ASC
    `)
    .all(req.user.id);

  const subjectBreakdown = subjectRows.map((r) => ({
    subject: r.subject || 'General',
    totalQuestions: r.total_questions,
    attempted: r.attempted,
    correct: r.correct,
    wrong: r.wrong,
    accuracy: r.attempted > 0 ? Number(((r.correct / r.attempted) * 100).toFixed(1)) : 0,
    marksEarned: Number((r.marks_earned || 0).toFixed(2)),
  }));

  // Course breakdown
  const courseMap = new Map();
  for (const a of attempts) {
    if (!courseMap.has(a.course_id)) {
      courseMap.set(a.course_id, {
        courseId: a.course_id,
        courseTitle: a.course_title,
        testsTaken: 0,
        sumPct: 0,
        bestPct: 0,
      });
    }
    const c = courseMap.get(a.course_id);
    const pct = a.max_score > 0 ? Math.max(0, (a.score / a.max_score) * 100) : 0;
    c.testsTaken += 1;
    c.sumPct += pct;
    if (pct > c.bestPct) c.bestPct = pct;
  }

  const courseBreakdown = Array.from(courseMap.values()).map((c) => ({
    courseId: c.courseId,
    courseTitle: c.courseTitle,
    testsTaken: c.testsTaken,
    averageScorePercent: Number((c.sumPct / c.testsTaken).toFixed(1)),
    bestScorePercent: Number(c.bestPct.toFixed(1)),
  }));

  const scoreTrend = attempts
    .slice(0, 10)
    .reverse()
    .map((a) => ({
      attemptId: a.id,
      label: a.test_title.length > 14 ? `${a.test_title.slice(0, 14)}…` : a.test_title,
      scorePercent: a.max_score > 0 ? Number(((a.score / a.max_score) * 100).toFixed(1)) : 0,
      accuracy: a.accuracy,
      submittedAt: a.submitted_at,
    }));

  const enrolledCountRow = db
    .prepare('SELECT COUNT(*) AS count FROM course_enrollments WHERE student_id = ?')
    .get(req.user.id);

  return res.json({
    summary: {
      enrolledCourses: enrolledCountRow?.count || 0,
      totalTestsTaken,
      averageScorePercent,
      averageAccuracy,
      bestScorePercent: Number(bestScorePercent.toFixed(1)),
      totalAttempted,
      totalCorrect,
      totalWrong,
      totalUnattempted,
    },
    subjectBreakdown,
    courseBreakdown,
    scoreTrend,
    recentAttempts: attempts,
  });
});

module.exports = router;
