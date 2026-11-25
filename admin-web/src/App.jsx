import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  LayoutDashboard,
  Users,
  LogOut,
  Plus,
  Trash2,
  UserCheck,
  FileText,
  ArrowLeft,
  Clock,
} from 'lucide-react';
import { api, setToken } from './api';
import EnrollmentModal from './components/EnrollmentModal';
import TestQuestionsView from './components/TestQuestionsView';
import AttemptReviewModal from './components/AttemptReviewModal';

function LoginView({ onLogin }) {
  const [email, setEmail] = useState('admin@testseries.app');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.login(email, password);
      if (res.user.role !== 'admin') {
        throw new Error('This portal requires an Admin account');
      }
      setToken(res.token);
      onLogin(res.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <div style={{ marginBottom: 20 }}>
          <span className="badge badge-indigo">Admin Control Center</span>
          <h1 style={{ margin: '10px 0 6px', fontSize: 24 }}>ExamPulse Admin</h1>
          <p className="page-subtitle">
            Manage courses, 100-minute test series, bulk question imports, and student enrollments.
          </p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="field">
            <label>Admin Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In to Admin Portal'}
          </button>
        </form>
        <p className="page-subtitle" style={{ marginTop: 14, fontSize: 12 }}>
          Demo Admin: <code>admin@testseries.app</code> / <code>Admin@123</code>
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [section, setSection] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseTests, setCourseTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [enrollCourse, setEnrollCourse] = useState(null);
  const [reviewAttemptId, setReviewAttemptId] = useState(null);
  const [error, setError] = useState('');

  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    category: 'Competitive Exams',
    is_self_enroll: true,
  });

  const [newTest, setNewTest] = useState({
    title: '',
    description: '',
    duration_minutes: 100,
    marks_correct: 4,
    negative_marks: 1,
    allow_multiple_attempts: true,
  });

  async function loadAll() {
    setError('');
    try {
      const [ov, cs, st] = await Promise.all([api.overview(), api.courses(), api.students()]);
      setOverview(ov);
      setCourses(cs.courses || []);
      setStudents(st.students || []);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      setCheckingAuth(false);
      return;
    }
    api
      .me()
      .then((res) => {
        if (res.user?.role === 'admin') {
          setUser(res.user);
        } else {
          setToken('');
        }
      })
      .catch(() => setToken(''))
      .finally(() => setCheckingAuth(false));
  }, []);

  useEffect(() => {
    if (user) loadAll();
  }, [user]);

  async function openCourse(course) {
    setSelectedCourse(course);
    setSelectedTest(null);
    try {
      const res = await api.courseTests(course.id);
      setCourseTests(res.tests || []);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreateCourse(e) {
    e.preventDefault();
    setError('');
    try {
      await api.createCourse(newCourse);
      setNewCourse({ title: '', description: '', category: 'Competitive Exams', is_self_enroll: true });
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteCourse(id) {
    if (!window.confirm('Delete this course and all its test series?')) return;
    try {
      await api.deleteCourse(id);
      if (selectedCourse?.id === id) setSelectedCourse(null);
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreateTest(e) {
    e.preventDefault();
    if (!selectedCourse) return;
    setError('');
    try {
      await api.createTest(selectedCourse.id, newTest);
      setNewTest({
        title: '',
        description: '',
        duration_minutes: 100,
        marks_correct: 4,
        negative_marks: 1,
        allow_multiple_attempts: true,
      });
      await openCourse(selectedCourse);
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteTest(testId) {
    if (!window.confirm('Delete this test and all its questions?')) return;
    try {
      await api.deleteTest(testId);
      await openCourse(selectedCourse);
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  function logout() {
    setToken('');
    setUser(null);
    setSelectedCourse(null);
    setSelectedTest(null);
  }

  if (checkingAuth) return null;
  if (!user) return <LoginView onLogin={setUser} />;

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <BookOpen size={22} color="#818cf8" />
          <span>ExamPulse Admin</span>
        </div>
        <button
          className={`nav-item ${section === 'overview' ? 'active' : ''}`}
          onClick={() => {
            setSection('overview');
            setSelectedCourse(null);
            setSelectedTest(null);
          }}
        >
          <LayoutDashboard size={17} /> Dashboard
        </button>
        <button
          className={`nav-item ${section === 'courses' ? 'active' : ''}`}
          onClick={() => {
            setSection('courses');
            setSelectedTest(null);
          }}
        >
          <BookOpen size={17} /> Courses & Test Series
        </button>
        <button
          className={`nav-item ${section === 'students' ? 'active' : ''}`}
          onClick={() => {
            setSection('students');
            setSelectedCourse(null);
            setSelectedTest(null);
          }}
        >
          <Users size={17} /> Students
        </button>

        <div className="sidebar-footer">
          <div style={{ fontSize: 13, fontWeight: 600 }}>{user.name}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>{user.email}</div>
          <button className="nav-item" onClick={logout}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      <main className="main-content">
        {error && <div className="alert alert-error">{error}</div>}

        {section === 'overview' && overview && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Admin Overview</h1>
                <p className="page-subtitle">Live summary of courses, tests, and student submissions</p>
              </div>
            </div>

            <div className="grid-kpi">
              <div className="card">
                <div className="kpi-label">Registered Students</div>
                <div className="kpi-value">{overview.counts.students}</div>
              </div>
              <div className="card">
                <div className="kpi-label">Courses</div>
                <div className="kpi-value">{overview.counts.courses}</div>
              </div>
              <div className="card">
                <div className="kpi-label">Test Series</div>
                <div className="kpi-value">{overview.counts.tests}</div>
              </div>
              <div className="card">
                <div className="kpi-label">Question Bank</div>
                <div className="kpi-value">{overview.counts.questions}</div>
              </div>
              <div className="card">
                <div className="kpi-label">Submitted Attempts</div>
                <div className="kpi-value">{overview.counts.submittedAttempts}</div>
              </div>
            </div>

            <div className="card table-wrap">
              <h3 style={{ marginTop: 0 }}>Recent Student Test Submissions</h3>
              {overview.recentAttempts.length === 0 ? (
                <p className="page-subtitle">No submitted tests yet.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Course</th>
                      <th>Test</th>
                      <th>Score</th>
                      <th>Accuracy</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.recentAttempts.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <strong>{a.student_name}</strong>
                          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{a.student_email}</div>
                        </td>
                        <td>{a.course_title}</td>
                        <td>{a.test_title}</td>
                        <td>
                          <strong>{a.score}</strong> / {a.max_score}
                        </td>
                        <td>{a.accuracy}%</td>
                        <td>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setReviewAttemptId(a.id)}
                          >
                            View Answers
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {section === 'courses' && !selectedCourse && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Courses & Test Series</h1>
                <p className="page-subtitle">Create courses, control enrollment, and publish timed tests</p>
              </div>
            </div>

            <form onSubmit={handleCreateCourse} className="card" style={{ marginBottom: 22 }}>
              <h3 style={{ marginTop: 0, marginBottom: 14 }}>Create New Course</h3>
              <div className="row-2">
                <div className="field">
                  <label>Course Title</label>
                  <input
                    className="input"
                    placeholder="e.g., SSC CGL Full Mock Series 2026"
                    value={newCourse.title}
                    onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label>Category</label>
                  <input
                    className="input"
                    value={newCourse.category}
                    onChange={(e) => setNewCourse({ ...newCourse, category: e.target.value })}
                  />
                </div>
              </div>
              <div className="field">
                <label>Description</label>
                <input
                  className="input"
                  placeholder="Short description of what this test series course covers"
                  value={newCourse.description}
                  onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                />
              </div>
              <div className="flex-gap" style={{ justifyContent: 'space-between' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
                  <input
                    type="checkbox"
                    checked={newCourse.is_self_enroll}
                    onChange={(e) => setNewCourse({ ...newCourse, is_self_enroll: e.target.checked })}
                  />
                  Allow students to self-enroll from the mobile app
                </label>
                <button className="btn btn-primary" type="submit">
                  <Plus size={15} /> Create Course
                </button>
              </div>
            </form>

            <div className="course-grid">
              {courses.map((c) => (
                <div key={c.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="flex-gap" style={{ justifyContent: 'space-between' }}>
                    <span className="badge badge-indigo">{c.category}</span>
                    <span className={`badge ${c.is_self_enroll ? 'badge-green' : 'badge-amber'}`}>
                      {c.is_self_enroll ? 'Self-Enroll Open' : 'Admin Assigned'}
                    </span>
                  </div>
                  <h3 style={{ margin: 0 }}>{c.title}</h3>
                  <p className="page-subtitle" style={{ margin: 0, flex: 1 }}>
                    {c.description || 'No description provided.'}
                  </p>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                    {c.test_count} tests · {c.enrolled_count} enrolled students
                  </div>
                  <div className="flex-gap" style={{ marginTop: 4 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => openCourse(c)}>
                      <FileText size={14} /> Manage Tests
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEnrollCourse(c)}>
                      <UserCheck size={14} /> Enrollments
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteCourse(c.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === 'courses' && selectedCourse && !selectedTest && (
          <div>
            <div className="page-header">
              <div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedCourse(null)}
                  style={{ marginBottom: 8 }}
                >
                  <ArrowLeft size={14} /> All Courses
                </button>
                <h1 className="page-title">{selectedCourse.title}</h1>
                <p className="page-subtitle">Configure timed test series and question papers for this course</p>
              </div>
              <button className="btn btn-secondary" onClick={() => setEnrollCourse(selectedCourse)}>
                <UserCheck size={15} /> Manage Students
              </button>
            </div>

            <form onSubmit={handleCreateTest} className="card" style={{ marginBottom: 22 }}>
              <h3 style={{ marginTop: 0, marginBottom: 14 }}>Add Test Series to Course</h3>
              <div className="row-2">
                <div className="field">
                  <label>Test Title</label>
                  <input
                    className="input"
                    placeholder="e.g., Full Mock Test #2 (100 Qs · 100 Min)"
                    value={newTest.title}
                    onChange={(e) => setNewTest({ ...newTest, title: e.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label>Duration (Minutes)</label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    value={newTest.duration_minutes}
                    onChange={(e) => setNewTest({ ...newTest, duration_minutes: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="field">
                  <label>Marks per Correct Answer (+)</label>
                  <input
                    className="input"
                    type="number"
                    step="0.25"
                    min="0.25"
                    value={newTest.marks_correct}
                    onChange={(e) => setNewTest({ ...newTest, marks_correct: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="field">
                  <label>Negative Marks per Wrong Answer (-)</label>
                  <input
                    className="input"
                    type="number"
                    step="0.25"
                    min="0"
                    value={newTest.negative_marks}
                    onChange={(e) => setNewTest({ ...newTest, negative_marks: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>
              <div className="field">
                <label>Instructions / Description</label>
                <input
                  className="input"
                  value={newTest.description}
                  onChange={(e) => setNewTest({ ...newTest, description: e.target.value })}
                />
              </div>
              <button className="btn btn-primary" type="submit">
                <Plus size={15} /> Create Test Series
              </button>
            </form>

            <div className="course-grid">
              {courseTests.map((t) => (
                <div key={t.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="flex-gap" style={{ justifyContent: 'space-between' }}>
                    <span className="badge badge-indigo">
                      <Clock size={12} style={{ marginRight: 4 }} /> {t.duration_minutes} min
                    </span>
                    <span className="badge badge-green">
                      +{t.marks_correct} / -{t.negative_marks}
                    </span>
                  </div>
                  <h3 style={{ margin: 0 }}>{t.title}</h3>
                  <p className="page-subtitle" style={{ margin: 0, flex: 1 }}>
                    {t.description || 'No description'}
                  </p>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                    {t.question_count} questions · {t.attempt_count} student attempts
                  </div>
                  <div className="flex-gap">
                    <button className="btn btn-primary btn-sm" onClick={() => setSelectedTest(t)}>
                      Questions & Results
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteTest(t.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === 'courses' && selectedCourse && selectedTest && (
          <TestQuestionsView
            test={selectedTest}
            course={selectedCourse}
            onBack={() => {
              setSelectedTest(null);
              openCourse(selectedCourse);
            }}
          />
        )}

        {section === 'students' && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Registered Students</h1>
                <p className="page-subtitle">All students registered from the mobile app</p>
              </div>
            </div>
            <div className="card table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Enrolled Courses</th>
                    <th>Tests Taken</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td><strong>{s.name}</strong></td>
                      <td>{s.email}</td>
                      <td>{s.phone || '—'}</td>
                      <td>{s.enrolled_courses}</td>
                      <td>{s.tests_taken}</td>
                      <td>{new Date(s.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {enrollCourse && (
        <EnrollmentModal
          course={enrollCourse}
          students={students}
          onClose={() => setEnrollCourse(null)}
          onUpdated={loadAll}
        />
      )}

      {reviewAttemptId && (
        <AttemptReviewModal
          attemptId={reviewAttemptId}
          onClose={() => setReviewAttemptId(null)}
        />
      )}
    </div>
  );
}
