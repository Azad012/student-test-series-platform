const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const config = require('./config');

let dbInstance = null;

function createDatabase(dbPath = config.DB_PATH) {
  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  if (dbPath !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;');
  }

  initSchema(db);
  return db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student', 'admin')) DEFAULT 'student',
      phone TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      category TEXT DEFAULT 'General',
      is_self_enroll INTEGER NOT NULL DEFAULT 1,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS course_enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      enrolled_at TEXT NOT NULL,
      UNIQUE(course_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS test_series (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      duration_minutes INTEGER NOT NULL DEFAULT 100,
      marks_correct REAL NOT NULL DEFAULT 1,
      negative_marks REAL NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 1,
      allow_multiple_attempts INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_id INTEGER NOT NULL REFERENCES test_series(id) ON DELETE CASCADE,
      order_index INTEGER NOT NULL DEFAULT 1,
      subject TEXT NOT NULL DEFAULT 'General',
      question_text TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      option_d TEXT NOT NULL,
      correct_option TEXT NOT NULL CHECK(correct_option IN ('A', 'B', 'C', 'D')),
      explanation TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_id INTEGER NOT NULL REFERENCES test_series(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK(status IN ('in_progress', 'submitted', 'auto_submitted')) DEFAULT 'in_progress',
      started_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      submitted_at TEXT,
      total_questions INTEGER NOT NULL DEFAULT 0,
      attempted_count INTEGER NOT NULL DEFAULT 0,
      correct_count INTEGER NOT NULL DEFAULT 0,
      wrong_count INTEGER NOT NULL DEFAULT 0,
      unattempted_count INTEGER NOT NULL DEFAULT 0,
      score REAL NOT NULL DEFAULT 0,
      max_score REAL NOT NULL DEFAULT 0,
      accuracy REAL NOT NULL DEFAULT 0,
      time_taken_seconds INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS attempt_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attempt_id INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
      question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      selected_option TEXT CHECK(selected_option IN ('A', 'B', 'C', 'D') OR selected_option IS NULL),
      is_marked_for_review INTEGER NOT NULL DEFAULT 0,
      is_visited INTEGER NOT NULL DEFAULT 0,
      is_correct INTEGER,
      marks_awarded REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      UNIQUE(attempt_id, question_id)
    );

    CREATE TABLE IF NOT EXISTS email_otps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      purpose TEXT NOT NULL CHECK(purpose IN ('register', 'reset_password')),
      otp_code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_email_otps_lookup ON email_otps(email, purpose);
    CREATE INDEX IF NOT EXISTS idx_enrollments_student ON course_enrollments(student_id);
    CREATE INDEX IF NOT EXISTS idx_tests_course ON test_series(course_id);
    CREATE INDEX IF NOT EXISTS idx_questions_test ON questions(test_id, order_index);
    CREATE INDEX IF NOT EXISTS idx_attempts_student ON attempts(student_id, test_id);
    CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt ON attempt_answers(attempt_id);
  `);
}

function getDb() {
  if (!dbInstance) {
    dbInstance = createDatabase();
  }
  return dbInstance;
}

function setDb(db) {
  dbInstance = db;
}

module.exports = {
  createDatabase,
  getDb,
  setDb,
};
