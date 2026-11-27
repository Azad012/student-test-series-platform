import { useState, useEffect } from 'react'
import { api } from '../api'

export default function CoursesPage({ onStartExam, onReview }) {
  const [courses, setCourses]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [openCourse, setOpenCourse] = useState(null)
  const [tests, setTests]           = useState([])
  const [testsLoading, setTL]       = useState(false)
  const [enrolling, setEnrolling]   = useState(null)
  const [starting, setStarting]     = useState(null)

  useEffect(() => {
    api.courses()
      .then(r => setCourses(r.courses || r))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function openCourseTests(course) {
    setOpenCourse(course)
    setTL(true)
    try {
      const r = await api.courseTests(course.id)
      setTests(r.tests || r)
    } catch(e) { setError(e.message) }
    finally { setTL(false) }
  }

  async function handleEnroll(courseId) {
    setEnrolling(courseId)
    try {
      await api.enrollCourse(courseId)
      const r = await api.courses()
      setCourses(r.courses || r)
      const updated = (r.courses || r).find(c => c.id === courseId)
      if (updated) setOpenCourse(updated)
    } catch(e) { setError(e.message) }
    finally { setEnrolling(null) }
  }

  async function handleStart(test) {
    setStarting(test.id)
    try {
      const r = await api.startAttempt(test.id)
      onStartExam({ ...r, testTitle: test.title })
    } catch(e) { setError(e.message) }
    finally { setStarting(null) }
  }

  if (loading) return <div style={{display:'flex',justifyContent:'center',padding:60}}><div className="spinner" /></div>
  if (error)   return <div className="error-box">{error}</div>

  if (openCourse) return (
    <div>
      <button className="btn btn-outline btn-sm" style={{marginBottom:20}} onClick={() => setOpenCourse(null)}>← Back to Courses</button>
      <h1 className="page-title">{openCourse.name}</h1>
      {openCourse.description && <p className="text-muted" style={{marginBottom:20}}>{openCourse.description}</p>}

      {!openCourse.enrolled && (
        <div className="card" style={{marginBottom:20,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
          <div>
            <div className="fw-bold">Enroll in this course</div>
            <div className="text-muted text-sm">Get access to all tests in this course.</div>
          </div>
          <button className="btn btn-primary" onClick={() => handleEnroll(openCourse.id)} disabled={enrolling === openCourse.id}>
            {enrolling === openCourse.id ? 'Enrolling…' : 'Enroll Now'}
          </button>
        </div>
      )}

      {testsLoading ? (
        <div style={{display:'flex',justifyContent:'center',padding:40}}><div className="spinner" /></div>
      ) : (
        <div>
          <div className="section-title">📋 Tests ({tests.length})</div>
          {tests.length === 0 && <p className="text-muted">No tests available yet.</p>}
          <div className="tests-list">
            {tests.map(t => (
              <div key={t.id} className="test-row">
                <div>
                  <div className="test-name">{t.title}</div>
                  <div className="test-meta">⏱ {t.durationMinutes} min &nbsp;·&nbsp; {t.questionCount || 100} questions</div>
                </div>
                <div style={{display:'flex',gap:8}}>
                  {t.lastAttemptId && (
                    <button className="btn btn-outline btn-sm" onClick={() => onReview(t.lastAttemptId)}>Review</button>
                  )}
                  {openCourse.enrolled && (
                    <button className="btn btn-primary btn-sm" onClick={() => handleStart(t)} disabled={starting === t.id}>
                      {starting === t.id ? 'Starting…' : t.lastAttemptId ? 'Retake' : 'Start Test'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div>
      <h1 className="page-title">📚 Courses</h1>
      {courses.length === 0 && <p className="text-muted">No courses available yet. Check back soon!</p>}
      <div className="courses-grid">
        {courses.map(c => (
          <div key={c.id} className="course-card">
            <div className="flex items-center justify-between" style={{marginBottom:6}}>
              <div className="course-name">{c.name}</div>
              {c.enrolled && <span className="badge badge-success">Enrolled</span>}
            </div>
            <div className="course-desc">{c.description || 'Practice mock tests for this course.'}</div>
            <button className="btn btn-primary w-full btn-sm" onClick={() => openCourseTests(c)}>
              View Tests →
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
