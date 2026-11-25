const express = require('express');
const { getDb } = require('../db');
const { hashPassword, verifyPassword, signToken, authenticate } = require('../utils/auth');

const router = express.Router();

router.post('/register', (req, res) => {
  const { name, email, password, phone = '' } = req.body || {};
  const cleanName = String(name || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPassword = String(password || '');

  if (!cleanName || !cleanEmail || cleanPassword.length < 6) {
    return res.status(400).json({
      error: 'Name, valid email, and password (at least 6 characters) are required',
    });
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const passwordHash = hashPassword(cleanPassword);
  const nowIso = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO users (name, email, password_hash, role, phone, created_at)
       VALUES (?, ?, ?, 'student', ?, ?)`
    )
    .run(cleanName, cleanEmail, passwordHash, String(phone || '').trim(), nowIso);

  const user = db
    .prepare('SELECT id, name, email, role, phone, created_at FROM users WHERE id = ?')
    .get(result.lastInsertRowid);

  // Auto-enroll newly registered students into open self-enrollable starter courses?
  // We keep explicit enrollment so students can browse & enroll, or admin assigns courses.
  const token = signToken(user);
  return res.status(201).json({ token, user });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPassword = String(password || '');

  if (!cleanEmail || !cleanPassword) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const db = getDb();
  const userRow = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);
  if (!userRow || !verifyPassword(cleanPassword, userRow.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const user = {
    id: userRow.id,
    name: userRow.name,
    email: userRow.email,
    role: userRow.role,
    phone: userRow.phone,
    created_at: userRow.created_at,
  };
  const token = signToken(user);
  return res.json({ token, user });
});

router.get('/me', authenticate, (req, res) => {
  const db = getDb();
  const user = db
    .prepare('SELECT id, name, email, role, phone, created_at FROM users WHERE id = ?')
    .get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  return res.json({ user });
});

module.exports = router;
