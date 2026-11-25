const express = require('express');
const { getDb } = require('../db');
const { authenticate, requireRole } = require('../utils/auth');

const router = express.Router();

router.use(authenticate, requireRole('admin'));

router.get('/overview', (req, res) => {
  const db = getDb();
  const counts = {
    students: db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'student'").get().c,
    courses: db.prepare('SELECT COUNT(*) AS c FROM courses').get().c,
    tests: db.prepare('SELECT COUNT(*) AS c FROM test_series').get().c,
    questions: db.prepare('SELECT COUNT(*) AS c FROM questions').get().c,
    submittedAttempts: db.prepare("SELECT COUNT(*) AS c FROM attempts WHERE status != 'in_progress'").get().c,
  };

  const recentAttempts = db
    .prepare(`
      SELECT a.id, a.score, a.max_score, a.accuracy, a.correct_count, a.wrong_count, a.submitted_at, a.status,
             u.name AS student_name, u.email AS student_email,
             t.title AS test_title, c.title AS course_title
      FROM attempts a
      JOIN users u ON u.id = a.student_id
      JOIN test_series t ON t.id = a.test_id
      JOIN courses c ON c.id = t.course_id
      WHERE a.status != 'in_progress'
      ORDER BY a.submitted_at DESC, a.id DESC
      LIMIT 15
    `)
    .all();

  return res.json({ counts, recentAttempts });
});

router.get('/students', (req, res) => {
  const db = getDb();
  const students = db
    .prepare(`
      SELECT u.id, u.name, u.email, u.phone, u.created_at,
             (SELECT COUNT(*) FROM course_enrollments e WHERE e.student_id = u.id) AS enrolled_courses,
             (SELECT COUNT(*) FROM attempts a WHERE a.student_id = u.id AND a.status != 'in_progress') AS tests_taken
      FROM users u
      WHERE u.role = 'student'
      ORDER BY u.id DESC
    `)
    .all();

  return res.json({ students });
});

router.get('/tests/:testId/attempts', (req, res) => {
  const testId = Number(req.params.testId);
  const db = getDb();
  const test = db.prepare('SELECT * FROM test_series WHERE id = ?').get(testId);
  if (!test) {
    return res.status(404).json({ error: 'Test not found' });
  }

  const attempts = db
    .prepare(`
      SELECT a.*, u.name AS student_name, u.email AS student_email
      FROM attempts a
      JOIN users u ON u.id = a.student_id
      WHERE a.test_id = ? AND a.status != 'in_progress'
      ORDER BY a.score DESC, a.time_taken_seconds ASC
    `)
    .all(testId);

  return res.json({ test, attempts });
});

module.exports = router;
