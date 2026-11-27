const express = require('express');
const crypto = require('crypto');
const { getDb } = require('../db');
const { hashPassword, verifyPassword, signToken, authenticate } = require('../utils/auth');
const { sendOtpEmail } = require('../utils/mailer');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_OTP_ATTEMPTS = 5;

function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function createAndStoreOtp(db, email, purpose) {
  const otp = generateOtp();
  const now = Date.now();
  const createdAt = new Date(now).toISOString();
  const expiresAt = new Date(now + OTP_TTL_MS).toISOString();

  db.prepare('DELETE FROM email_otps WHERE email = ? AND purpose = ?').run(email, purpose);
  db.prepare(
    `INSERT INTO email_otps (email, purpose, otp_code, expires_at, attempts, created_at)
     VALUES (?, ?, ?, ?, 0, ?)`
  ).run(email, purpose, otp, expiresAt, createdAt);

  return otp;
}

function verifyStoredOtp(db, email, purpose, otpInput) {
  const cleanOtp = String(otpInput || '').trim();
  if (!/^\d{6}$/.test(cleanOtp)) {
    return { ok: false, status: 400, error: 'Please enter a valid 6-digit OTP' };
  }

  const row = db
    .prepare('SELECT * FROM email_otps WHERE email = ? AND purpose = ? ORDER BY id DESC LIMIT 1')
    .get(email, purpose);

  if (!row) {
    return { ok: false, status: 400, error: 'No OTP found for this email. Please request a new OTP.' };
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM email_otps WHERE id = ?').run(row.id);
    return { ok: false, status: 400, error: 'OTP has expired. Please request a new OTP.' };
  }

  if (row.attempts >= MAX_OTP_ATTEMPTS) {
    db.prepare('DELETE FROM email_otps WHERE id = ?').run(row.id);
    return { ok: false, status: 429, error: 'Too many invalid OTP attempts. Please request a new OTP.' };
  }

  if (row.otp_code !== cleanOtp) {
    db.prepare('UPDATE email_otps SET attempts = attempts + 1 WHERE id = ?').run(row.id);
    return { ok: false, status: 400, error: 'Invalid OTP. Please check and try again.' };
  }

  db.prepare('DELETE FROM email_otps WHERE email = ? AND purpose = ?').run(email, purpose);
  return { ok: true };
}

// 1. Send Registration OTP
router.post('/send-register-otp', async (req, res, next) => {
  try {
    const { name = 'Student', email } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();

    if (!EMAIL_RE.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const otp = createAndStoreOtp(db, cleanEmail, 'register');
    const mailRes = await sendOtpEmail({
      to: cleanEmail,
      otp,
      purpose: 'register',
      name: String(name || 'Student').trim() || 'Student',
    });

    const payload = { message: 'OTP sent to your email address', mode: mailRes.mode };
    if (mailRes.devOtp) payload.devOtp = mailRes.devOtp;
    return res.json(payload);
  } catch (err) {
    next(err);
  }
});

// 2. Verify OTP & Complete Registration
router.post('/register', (req, res) => {
  const { name, email, password, phone = '', otp } = req.body || {};
  const cleanName = String(name || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPassword = String(password || '');

  if (!cleanName || !EMAIL_RE.test(cleanEmail) || cleanPassword.length < 6) {
    return res.status(400).json({
      error: 'Name, valid email, and password (at least 6 characters) are required',
    });
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const check = verifyStoredOtp(db, cleanEmail, 'register', otp);
  if (!check.ok) {
    return res.status(check.status).json({ error: check.error });
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

  const token = signToken(user);
  return res.status(201).json({ token, user });
});

// 3. Send Forgot Password OTP
router.post('/forgot-password/send-otp', async (req, res, next) => {
  try {
    const { email } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();

    if (!EMAIL_RE.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    const db = getDb();
    const userRow = db.prepare('SELECT id, name, email FROM users WHERE email = ?').get(cleanEmail);
    if (!userRow) {
      return res.status(404).json({ error: 'No account found with this email address' });
    }

    const otp = createAndStoreOtp(db, cleanEmail, 'reset_password');
    const mailRes = await sendOtpEmail({
      to: cleanEmail,
      otp,
      purpose: 'reset_password',
      name: userRow.name,
    });

    const payload = { message: 'Password reset OTP sent to your email', mode: mailRes.mode };
    if (mailRes.devOtp) payload.devOtp = mailRes.devOtp;
    return res.json(payload);
  } catch (err) {
    next(err);
  }
});

// 4. Verify OTP & Reset Password
router.post('/forgot-password/reset', (req, res) => {
  const { email, otp, newPassword } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPassword = String(newPassword || '');

  if (!EMAIL_RE.test(cleanEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }
  if (cleanPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  const db = getDb();
  const userRow = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
  if (!userRow) {
    return res.status(404).json({ error: 'No account found with this email address' });
  }

  const check = verifyStoredOtp(db, cleanEmail, 'reset_password', otp);
  if (!check.ok) {
    return res.status(check.status).json({ error: check.error });
  }

  const passwordHash = hashPassword(cleanPassword);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, userRow.id);

  return res.json({ message: 'Password reset successfully. You can now sign in.' });
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
