const express = require('express');
const { getDb } = require('../db');
const { authenticate, requireRole } = require('../utils/auth');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const db = getDb();
  if (req.user.role === 'admin') {
    const courses = db
      .prepare(`
        SELECT c.*,
               (SELECT COUNT(*) FROM test_series t WHERE t.course_id = c.id) AS test_count,
               (SELECT COUNT(*) FROM course_enrollments e WHERE e.course_id = c.id) AS enrolled_count
        FROM courses c
        ORDER BY c.id DESC
      `)
      .all();
    return res.json({ courses });
  }

  const courses = db
    .prepare(`
      SELECT c.*,
             (SELECT COUNT(*) FROM test_series t WHERE t.course_id = c.id AND t.is_published = 1) AS test_count,
             CASE WHEN e.id IS NOT NULL THEN 1 ELSE 0 END AS is_enrolled,
             e.enrolled_at
      FROM courses c
      LEFT JOIN course_enrollments e ON e.course_id = c.id AND e.student_id = ?
      WHERE c.is_published = 1 AND (c.is_self_enroll = 1 OR e.id IS NOT NULL)
      ORDER BY is_enrolled DESC, c.id DESC
    `)
    .all(req.user.id);
  return res.json({ courses });
});

router.post('/', authenticate, requireRole('admin'), (req, res) => {
  const {
    title,
    description = '',
    category = 'General',
    is_self_enroll = true,
    is_published = true,
  } = req.body || {};

  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) {
    return res.status(400).json({ error: 'Course title is required' });
  }

  const db = getDb();
  const nowIso = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO courses (title, description, category, is_self_enroll, is_published, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      cleanTitle,
      String(description || '').trim(),
      String(category || 'General').trim() || 'General',
      is_self_enroll ? 1 : 0,
      is_published ? 1 : 0,
      req.user.id,
      nowIso
    );

  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(result.lastInsertRowid);
  return res.status(201).json({ course });
});

router.put('/:id', authenticate, requireRole('admin'), (req, res) => {
  const courseId = Number(req.params.id);
  const db = getDb();
  const existing = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
  if (!existing) {
    return res.status(404).json({ error: 'Course not found' });
  }

  const {
    title = existing.title,
    description = existing.description,
    category = existing.category,
    is_self_enroll = existing.is_self_enroll,
    is_published = existing.is_published,
  } = req.body || {};

  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) {
    return res.status(400).json({ error: 'Course title is required' });
  }

  db.prepare(
    `UPDATE courses
     SET title = ?, description = ?, category = ?, is_self_enroll = ?, is_published = ?
     WHERE id = ?`
  ).run(
    cleanTitle,
    String(description || '').trim(),
    String(category || 'General').trim() || 'General',
    is_self_enroll ? 1 : 0,
    is_published ? 1 : 0,
    courseId
  );

  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
  return res.json({ course });
});

router.delete('/:id', authenticate, requireRole('admin'), (req, res) => {
  const courseId = Number(req.params.id);
  const db = getDb();
  const info = db.prepare('DELETE FROM courses WHERE id = ?').run(courseId);
  if (info.changes === 0) {
    return res.status(404).json({ error: 'Course not found' });
  }
  return res.json({ deleted: true });
});

// Student self-enrollment
router.post('/:id/enroll', authenticate, requireRole('student'), (req, res) => {
  const courseId = Number(req.params.id);
  const db = getDb();
  const course = db.prepare('SELECT * FROM courses WHERE id = ? AND is_published = 1').get(courseId);
  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }
  if (!course.is_self_enroll) {
    return res.status(403).json({ error: 'This course requires admin enrollment' });
  }

  const existing = db
    .prepare('SELECT * FROM course_enrollments WHERE course_id = ? AND student_id = ?')
    .get(courseId, req.user.id);
  if (existing) {
    return res.json({ enrolled: true, enrollment: existing });
  }

  const nowIso = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO course_enrollments (course_id, student_id, assigned_by, enrolled_at)
       VALUES (?, ?, NULL, ?)`
    )
    .run(courseId, req.user.id, nowIso);

  const enrollment = db.prepare('SELECT * FROM course_enrollments WHERE id = ?').get(info.lastInsertRowid);
  return res.status(201).json({ enrolled: true, enrollment });
});

// Admin enrollment management
router.get('/:id/enrollments', authenticate, requireRole('admin'), (req, res) => {
  const courseId = Number(req.params.id);
  const db = getDb();
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  const enrollments = db
    .prepare(`
      SELECT u.id AS student_id, u.name, u.email, u.phone, e.enrolled_at, e.assigned_by
      FROM course_enrollments e
      JOIN users u ON u.id = e.student_id
      WHERE e.course_id = ?
      ORDER BY e.enrolled_at DESC
    `)
    .all(courseId);

  return res.json({ course, enrollments });
});

router.post('/:id/enrollments', authenticate, requireRole('admin'), (req, res) => {
  const courseId = Number(req.params.id);
  const { studentId, email } = req.body || {};
  const db = getDb();

  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  let student = null;
  if (studentId) {
    student = db.prepare("SELECT id, name, email FROM users WHERE id = ? AND role = 'student'").get(Number(studentId));
  } else if (email) {
    student = db
      .prepare("SELECT id, name, email FROM users WHERE email = ? AND role = 'student'")
      .get(String(email).trim().toLowerCase());
  }

  if (!student) {
    return res.status(404).json({ error: 'Student not found' });
  }

  const existing = db
    .prepare('SELECT * FROM course_enrollments WHERE course_id = ? AND student_id = ?')
    .get(courseId, student.id);
  if (existing) {
    return res.json({ enrollment: existing, student });
  }

  const nowIso = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO course_enrollments (course_id, student_id, assigned_by, enrolled_at)
       VALUES (?, ?, ?, ?)`
    )
    .run(courseId, student.id, req.user.id, nowIso);

  const enrollment = db.prepare('SELECT * FROM course_enrollments WHERE id = ?').get(info.lastInsertRowid);
  return res.status(201).json({ enrollment, student });
});

router.delete('/:id/enrollments/:studentId', authenticate, requireRole('admin'), (req, res) => {
  const courseId = Number(req.params.id);
  const studentId = Number(req.params.studentId);
  const db = getDb();
  const info = db
    .prepare('DELETE FROM course_enrollments WHERE course_id = ? AND student_id = ?')
    .run(courseId, studentId);
  if (info.changes === 0) {
    return res.status(404).json({ error: 'Enrollment not found' });
  }
  return res.json({ deleted: true });
});

module.exports = router;
