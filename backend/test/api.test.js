const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createDatabase, setDb } = require('../src/db');
const { createApp } = require('../src/app');
const { ensureSeedData } = require('../src/seed');

let server;
let baseUrl;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const req = http.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = data ? JSON.parse(data) : null;
        } catch {
          parsed = data;
        }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (body !== null) req.write(JSON.stringify(body));
    req.end();
  });
}

test.before(async () => {
  const db = createDatabase(':memory:');
  setDb(db);
  ensureSeedData(db);
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('auth registration, login, and role protection', async () => {
  const reg = await request('POST', '/api/auth/register', {
    name: 'Priya Verma',
    email: 'priya@example.com',
    password: 'Password123',
    phone: '9123456789',
  });
  assert.equal(reg.status, 201);
  assert.ok(reg.body.token);
  assert.equal(reg.body.user.role, 'student');

  // Student cannot create a course
  const forbidden = await request(
    'POST',
    '/api/courses',
    { title: 'Hack Course' },
    reg.body.token
  );
  assert.equal(forbidden.status, 403);

  // Admin login
  const adminLogin = await request('POST', '/api/auth/login', {
    email: 'admin@testseries.app',
    password: 'Admin@123',
  });
  assert.equal(adminLogin.status, 200);
  assert.equal(adminLogin.body.user.role, 'admin');
});

test('admin creates course, test series, bulk CSV import, assigns student, and student takes timed test', async () => {
  const adminLogin = await request('POST', '/api/auth/login', {
    email: 'admin@testseries.app',
    password: 'Admin@123',
  });
  const adminToken = adminLogin.body.token;

  // Create admin-assigned course
  const courseRes = await request(
    'POST',
    '/api/courses',
    {
      title: 'GATE CS Mock Series',
      description: '100-minute timed tests',
      category: 'Engineering',
      is_self_enroll: false,
      is_published: true,
    },
    adminToken
  );
  assert.equal(courseRes.status, 201);
  const courseId = courseRes.body.course.id;

  // Create test with +4 / -1 negative marking
  const testRes = await request(
    'POST',
    `/api/tests/course/${courseId}`,
    {
      title: 'CS Core Test 1',
      duration_minutes: 100,
      marks_correct: 4,
      negative_marks: 1,
    },
    adminToken
  );
  assert.equal(testRes.status, 201);
  const testId = testRes.body.test.id;

  // Bulk CSV import
  const csv = [
    'subject,question_text,option_a,option_b,option_c,option_d,correct_option,explanation',
    'Algorithms,"Time complexity of binary search?",O(n),O(log n),O(n log n),O(1),B,"Halves search space each step"',
    'OS,"Which scheduling is non-preemptive?",Round Robin,SRTF,FCFS,MLFQ,C,"First Come First Served runs to completion"',
    'DBMS,"SQL command to remove a table?",DELETE,DROP,TRUNCATE,REMOVE,B,"DROP removes table structure and data"',
  ].join('\n');

  const importRes = await request(
    'POST',
    `/api/tests/${testId}/questions/import`,
    { format: 'csv', data: csv },
    adminToken
  );
  assert.equal(importRes.status, 201);
  assert.equal(importRes.body.importedCount, 3);
  assert.equal(importRes.body.errorCount, 0);

  // Student registered earlier tries to start before enrollment -> 403
  const studentLogin = await request('POST', '/api/auth/login', {
    email: 'priya@example.com',
    password: 'Password123',
  });
  const studentToken = studentLogin.body.token;

  const blockedStart = await request('POST', `/api/attempts/tests/${testId}/start`, {}, studentToken);
  assert.equal(blockedStart.status, 403);

  // Admin assigns student to course
  const assignRes = await request(
    'POST',
    `/api/courses/${courseId}/enrollments`,
    { email: 'priya@example.com' },
    adminToken
  );
  assert.equal(assignRes.status, 201);

  // Student starts test -> receives questions WITHOUT correct_option
  const startRes = await request('POST', `/api/attempts/tests/${testId}/start`, {}, studentToken);
  assert.equal(startRes.status, 200);
  assert.equal(startRes.body.questions.length, 3);
  assert.equal(startRes.body.questions[0].correct_option, undefined);
  assert.ok(startRes.body.remainingSeconds > 5900);

  const attemptId = startRes.body.attempt.id;
  const [q1, q2] = startRes.body.questions;

  // Answer q1 correctly (B), q2 wrong (A), leave q3 unattempted
  const save1 = await request(
    'PUT',
    `/api/attempts/${attemptId}/answer`,
    { questionId: q1.id, selectedOption: 'B', isMarkedForReview: false, isVisited: true },
    studentToken
  );
  assert.equal(save1.status, 200);

  const save2 = await request(
    'PUT',
    `/api/attempts/${attemptId}/answer`,
    { questionId: q2.id, selectedOption: 'A', isMarkedForReview: true, isVisited: true },
    studentToken
  );
  assert.equal(save2.status, 200);

  // Submit attempt -> Score should be +4 - 1 = 3 out of 12, accuracy 50%
  const submitRes = await request('POST', `/api/attempts/${attemptId}/submit`, {}, studentToken);
  assert.equal(submitRes.status, 200);
  assert.equal(submitRes.body.attempt.score, 3);
  assert.equal(submitRes.body.attempt.max_score, 12);
  assert.equal(submitRes.body.attempt.correct_count, 1);
  assert.equal(submitRes.body.attempt.wrong_count, 1);
  assert.equal(submitRes.body.attempt.unattempted_count, 1);
  assert.equal(submitRes.body.attempt.accuracy, 50);

  // Review Q&A after submission
  const reviewRes = await request('GET', `/api/attempts/${attemptId}/result`, null, studentToken);
  assert.equal(reviewRes.status, 200);
  assert.equal(reviewRes.body.questions.length, 3);
  assert.equal(reviewRes.body.questions[0].correct_option, 'B');
  assert.equal(reviewRes.body.questions[0].marks_awarded, 4);
  assert.equal(reviewRes.body.questions[1].marks_awarded, -1);
  assert.equal(reviewRes.body.questions[2].marks_awarded, 0);

  // Student dashboard analytics
  const dashRes = await request('GET', '/api/student/dashboard', null, studentToken);
  assert.equal(dashRes.status, 200);
  assert.equal(dashRes.body.summary.totalTestsTaken, 1);
  assert.equal(dashRes.body.summary.averageAccuracy, 50);
  assert.equal(dashRes.body.subjectBreakdown.length, 3);
});

test('seeded 100-question 100-minute mock test exists and is accessible', async () => {
  const studentLogin = await request('POST', '/api/auth/login', {
    email: 'student@testseries.app',
    password: 'Student@123',
  });
  const token = studentLogin.body.token;
  const coursesRes = await request('GET', '/api/courses', null, token);
  assert.equal(coursesRes.status, 200);
  const firstCourse = coursesRes.body.courses.find((c) => c.title.includes('All-India'));
  assert.ok(firstCourse);

  const testsRes = await request('GET', `/api/tests/course/${firstCourse.id}`, null, token);
  assert.equal(testsRes.status, 200);
  const mock100 = testsRes.body.tests.find((t) => t.duration_minutes === 100);
  assert.ok(mock100);
  assert.equal(mock100.question_count, 100);
});
