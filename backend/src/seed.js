const { getDb } = require('./db');
const { hashPassword } = require('./utils/auth');
const { finalizeAttempt } = require('./utils/grading');

function generate100MockQuestions() {
  const subjects = ['Quantitative Aptitude', 'Logical Reasoning', 'Verbal Ability', 'General Science'];
  const items = [];

  for (let i = 1; i <= 100; i += 1) {
    const subject = subjects[(i - 1) % subjects.length];
    if (subject === 'Quantitative Aptitude') {
      const a = (i % 15) + 4;
      const b = ((i * 3) % 12) + 2;
      const sum = a * b + (i % 7);
      const ans = ['A', 'B', 'C', 'D'][i % 4];
      const distractors = [sum - 3, sum + 4, sum + 9];
      const opts = { A: '', B: '', C: '', D: '' };
      let dIdx = 0;
      for (const key of ['A', 'B', 'C', 'D']) {
        if (key === ans) opts[key] = String(sum);
        else {
          opts[key] = String(distractors[dIdx]);
          dIdx += 1;
        }
      }
      items.push({
        subject,
        question_text: `Q${i}. Evaluate the expression: (${a} × ${b}) + ${i % 7}.`,
        option_a: opts.A,
        option_b: opts.B,
        option_c: opts.C,
        option_d: opts.D,
        correct_option: ans,
        explanation: `${a} × ${b} = ${a * b}, and adding ${i % 7} gives ${sum}.`,
      });
    } else if (subject === 'Logical Reasoning') {
      const start = (i % 9) + 2;
      const step = (i % 5) + 3;
      const nextTerm = start + step * 4;
      const ans = ['A', 'B', 'C', 'D'][i % 4];
      const distractors = [nextTerm - 2, nextTerm + 2, nextTerm + step];
      const opts = { A: '', B: '', C: '', D: '' };
      let dIdx = 0;
      for (const key of ['A', 'B', 'C', 'D']) {
        if (key === ans) opts[key] = String(nextTerm);
        else {
          opts[key] = String(distractors[dIdx]);
          dIdx += 1;
        }
      }
      items.push({
        subject,
        question_text: `Q${i}. Find the next number in the sequence: ${start}, ${start + step}, ${start + step * 2}, ${start + step * 3}, ?`,
        option_a: opts.A,
        option_b: opts.B,
        option_c: opts.C,
        option_d: opts.D,
        correct_option: ans,
        explanation: `Each term increases by ${step}. So ${start + step * 3} + ${step} = ${nextTerm}.`,
      });
    } else if (subject === 'Verbal Ability') {
      const bank = [
        {
          q: 'Choose the word closest in meaning to "Concise".',
          opts: ['Verbose', 'Brief', 'Confusing', 'Delayed'],
          ans: 'B',
          exp: '"Concise" means giving a lot of information clearly and in a few words (brief).',
        },
        {
          q: 'Choose the antonym of "Abundant".',
          opts: ['Plentiful', 'Scarce', 'Ample', 'Generous'],
          ans: 'B',
          exp: '"Scarce" means insufficient for the demand, the opposite of abundant.',
        },
        {
          q: 'Identify the correctly spelled word.',
          opts: ['Accomodate', 'Acommodate', 'Accommodate', 'Acomodate'],
          ans: 'C',
          exp: '"Accommodate" is spelled with double c and double m.',
        },
        {
          q: 'Complete the sentence: Neither the teacher nor the students ___ present.',
          opts: ['was', 'were', 'is', 'has been'],
          ans: 'B',
          exp: 'With "neither...nor", the verb agrees with the nearer plural noun "students" (were).',
        },
      ];
      const pick = bank[i % bank.length];
      items.push({
        subject,
        question_text: `Q${i}. ${pick.q}`,
        option_a: pick.opts[0],
        option_b: pick.opts[1],
        option_c: pick.opts[2],
        option_d: pick.opts[3],
        correct_option: pick.ans,
        explanation: pick.exp,
      });
    } else {
      const science = [
        {
          q: 'What is the SI unit of electric current?',
          opts: ['Volt', 'Ohm', 'Ampere', 'Watt'],
          ans: 'C',
          exp: 'Electric current is measured in Amperes (A).',
        },
        {
          q: 'Which organelle is known as the powerhouse of the cell?',
          opts: ['Ribosome', 'Mitochondria', 'Golgi apparatus', 'Lysosome'],
          ans: 'B',
          exp: 'Mitochondria generate most of the cell supply of ATP.',
        },
        {
          q: 'What is the chemical symbol for Sodium?',
          opts: ['So', 'Sd', 'Na', 'Sn'],
          ans: 'C',
          exp: 'Sodium comes from the Latin name Natrium, symbol Na.',
        },
        {
          q: 'Which planet in our solar system has the most moons confirmed?',
          opts: ['Mars', 'Venus', 'Saturn', 'Mercury'],
          ans: 'C',
          exp: 'Saturn leads with over 140 confirmed moons.',
        },
      ];
      const pick = science[i % science.length];
      items.push({
        subject,
        question_text: `Q${i}. ${pick.q}`,
        option_a: pick.opts[0],
        option_b: pick.opts[1],
        option_c: pick.opts[2],
        option_d: pick.opts[3],
        correct_option: pick.ans,
        explanation: pick.exp,
      });
    }
  }
  return items;
}

function ensureSeedData(db) {
  const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  if (userCount > 0) return false;

  const nowIso = new Date().toISOString();
  const adminRes = db
    .prepare(
      `INSERT INTO users (name, email, password_hash, role, phone, created_at)
       VALUES (?, ?, ?, 'admin', ?, ?)`
    )
    .run('Dr. Meera Admin', 'admin@testseries.app', hashPassword('Admin@123'), '9990001111', nowIso);

  const studentRes = db
    .prepare(
      `INSERT INTO users (name, email, password_hash, role, phone, created_at)
       VALUES (?, ?, ?, 'student', ?, ?)`
    )
    .run('Aarav Student', 'student@testseries.app', hashPassword('Student@123'), '9876543210', nowIso);

  const adminId = Number(adminRes.lastInsertRowid);
  const studentId = Number(studentRes.lastInsertRowid);

  const course1Res = db
    .prepare(
      `INSERT INTO courses (title, description, category, is_self_enroll, is_published, created_by, created_at)
       VALUES (?, ?, ?, 1, 1, ?, ?)`
    )
    .run(
      'All-India Aptitude & Reasoning Test Series',
      'Full-length timed CBT mock tests (100 Qs / 100 Min) plus quick subject drills with negative marking.',
      'Competitive Exams',
      adminId,
      nowIso
    );

  const course2Res = db
    .prepare(
      `INSERT INTO courses (title, description, category, is_self_enroll, is_published, created_by, created_at)
       VALUES (?, ?, ?, 0, 1, ?, ?)`
    )
    .run(
      'STEM Foundation Batch (Admin Assigned)',
      'Curated Physics, Chemistry & Math test series assigned to enrolled batch students.',
      'Science & Tech',
      adminId,
      nowIso
    );

  const course1Id = Number(course1Res.lastInsertRowid);
  const course2Id = Number(course2Res.lastInsertRowid);

  // Enroll demo student in Course 1 (and Course 2 so they see assigned course too)
  db.prepare(
    `INSERT INTO course_enrollments (course_id, student_id, assigned_by, enrolled_at) VALUES (?, ?, ?, ?)`
  ).run(course1Id, studentId, adminId, nowIso);
  db.prepare(
    `INSERT INTO course_enrollments (course_id, student_id, assigned_by, enrolled_at) VALUES (?, ?, ?, ?)`
  ).run(course2Id, studentId, adminId, nowIso);

  // Test 1: 100 Questions in 100 Minutes (+4 / -1)
  const test100Res = db
    .prepare(
      `INSERT INTO test_series
       (course_id, title, description, duration_minutes, marks_correct, negative_marks, is_published, allow_multiple_attempts, created_at)
       VALUES (?, ?, ?, 100, 4, 1, 1, 1, ?)`
    )
    .run(
      course1Id,
      'Full Mock Test #1 (100 Qs · 100 Min)',
      'Standard 100-minute timed CBT simulation across Quant, Reasoning, Verbal & Science (+4 / -1).',
      nowIso
    );
  const test100Id = Number(test100Res.lastInsertRowid);

  const insertQ = db.prepare(
    `INSERT INTO questions
     (test_id, order_index, subject, question_text, option_a, option_b, option_c, option_d, correct_option, explanation)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const mock100 = generate100MockQuestions();
  mock100.forEach((q, idx) => {
    insertQ.run(
      test100Id,
      idx + 1,
      q.subject,
      q.question_text,
      q.option_a,
      q.option_b,
      q.option_c,
      q.option_d,
      q.correct_option,
      q.explanation
    );
  });

  // Test 2: Quick 5-Question Sprint (5 Min, +2 / -0.5)
  const testQuickRes = db
    .prepare(
      `INSERT INTO test_series
       (course_id, title, description, duration_minutes, marks_correct, negative_marks, is_published, allow_multiple_attempts, created_at)
       VALUES (?, ?, ?, 5, 2, 0.5, 1, 1, ?)`
    )
    .run(
      course1Id,
      'Quick Diagnostic Sprint (5 Qs · 5 Min)',
      'Short 5-question warm-up test to verify timer, review palette, and instant score analytics.',
      nowIso
    );
  const testQuickId = Number(testQuickRes.lastInsertRowid);

  const quickQuestions = [
    {
      subject: 'Quantitative Aptitude',
      q: 'If a train travels 180 km in 3 hours, what is its average speed?',
      a: '50 km/h',
      b: '60 km/h',
      c: '70 km/h',
      d: '45 km/h',
      ans: 'B',
      exp: 'Speed = Distance / Time = 180 / 3 = 60 km/h.',
    },
    {
      subject: 'Logical Reasoning',
      q: 'If ALL roses are flowers and SOME flowers fade quickly, which statement is definitely true?',
      a: 'All roses fade quickly',
      b: 'No roses fade quickly',
      c: 'All roses are flowers',
      d: 'Some flowers are not roses',
      ans: 'C',
      exp: 'The first premise directly guarantees all roses are flowers.',
    },
    {
      subject: 'General Science',
      q: 'Which gas makes up approximately 78% of Earth’s atmosphere?',
      a: 'Oxygen',
      b: 'Carbon Dioxide',
      c: 'Argon',
      d: 'Nitrogen',
      ans: 'D',
      exp: 'Earth’s atmosphere is about 78% Nitrogen and 21% Oxygen.',
    },
    {
      subject: 'Verbal Ability',
      q: 'Select the correct passive form: "The admin published the test."',
      a: 'The test was published by the admin.',
      b: 'The test is published by the admin.',
      c: 'The test has published by the admin.',
      d: 'The admin was published the test.',
      ans: 'A',
      exp: 'Simple past active converts to "was + past participle".',
    },
    {
      subject: 'Quantitative Aptitude',
      q: 'What is 15% of 200?',
      a: '25',
      b: '30',
      c: '35',
      d: '40',
      ans: 'B',
      exp: '15/100 × 200 = 30.',
    },
  ];
  quickQuestions.forEach((q, idx) => {
    insertQ.run(testQuickId, idx + 1, q.subject, q.q, q.a, q.b, q.c, q.d, q.ans, q.exp);
  });

  // Test 3 in Course 2 (STEM Foundation)
  const testStemRes = db
    .prepare(
      `INSERT INTO test_series
       (course_id, title, description, duration_minutes, marks_correct, negative_marks, is_published, allow_multiple_attempts, created_at)
       VALUES (?, ?, ?, 30, 4, 1, 1, 1, ?)`
    )
    .run(
      course2Id,
      'Physics & Chemistry Checkpoint #1',
      'Core mechanics, electricity, and periodic properties test (+4 / -1).',
      nowIso
    );
  const testStemId = Number(testStemRes.lastInsertRowid);
  const stemQuestions = [
    {
      subject: 'Physics',
      q: 'Newton’s Second Law of Motion states that Force equals:',
      a: 'Mass × Velocity',
      b: 'Mass × Acceleration',
      c: 'Mass / Acceleration',
      d: 'Velocity / Time',
      ans: 'B',
      exp: 'F = m × a.',
    },
    {
      subject: 'Chemistry',
      q: 'What is the pH value of pure neutral water at 25°C?',
      a: '0',
      b: '5',
      c: '7',
      d: '14',
      ans: 'C',
      exp: 'Pure neutral water has a pH of 7.',
    },
    {
      subject: 'Mathematics',
      q: 'What is the derivative of x² with respect to x?',
      a: 'x',
      b: '2x',
      c: 'x²',
      d: '2',
      ans: 'B',
      exp: 'Using power rule d/dx(x^n) = n·x^(n-1), so 2x.',
    },
    {
      subject: 'Physics',
      q: 'Ohm’s Law is expressed as:',
      a: 'V = I × R',
      b: 'V = I / R',
      c: 'P = V / I',
      d: 'R = V × I',
      ans: 'A',
      exp: 'Voltage V equals current I multiplied by resistance R.',
    },
  ];
  stemQuestions.forEach((q, idx) => {
    insertQ.run(testStemId, idx + 1, q.subject, q.q, q.a, q.b, q.c, q.d, q.ans, q.exp);
  });

  // Seed one completed attempt for Quick Sprint so Student Dashboard has initial analytics
  const startedMs = Date.now() - 4 * 60 * 1000;
  const expiresMs = startedMs + 5 * 60 * 1000;
  const attRes = db
    .prepare(
      `INSERT INTO attempts (test_id, student_id, status, started_at, expires_at, total_questions, max_score)
       VALUES (?, ?, 'in_progress', ?, ?, ?, ?)`
    )
    .run(testQuickId, studentId, new Date(startedMs).toISOString(), new Date(expiresMs).toISOString(), 5, 10);
  const attemptId = Number(attRes.lastInsertRowid);

  const qRows = db.prepare('SELECT id, correct_option FROM questions WHERE test_id = ? ORDER BY order_index ASC').all(testQuickId);
  const insertAns = db.prepare(
    `INSERT INTO attempt_answers (attempt_id, question_id, selected_option, is_marked_for_review, is_visited, updated_at)
     VALUES (?, ?, ?, 0, 1, ?)`
  );
  // 3 correct, 1 wrong, 1 unattempted
  qRows.forEach((qr, idx) => {
    let sel = null;
    if (idx < 3) sel = qr.correct_option;
    else if (idx === 3) sel = qr.correct_option === 'A' ? 'B' : 'A';
    insertAns.run(attemptId, qr.id, sel, nowIso);
  });
  finalizeAttempt(db, attemptId, 'submitted');

  return true;
}

if (require.main === module) {
  const db = getDb();
  const seeded = ensureSeedData(db);
  console.log(seeded ? 'Database seeded successfully.' : 'Database already contains data.');
}

module.exports = { ensureSeedData };
