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
    loadCourses()
  }, [])

  async function loadCourses() {
    try {
      const r = await api.courses()
      setCourses(r.courses || r || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function openCourseTests(course) {
    setOpenCourse(course)
    setTL(true)
    setError('')
    try {
      const r = await api.courseTests(course.id)
      setTests(r.tests || r || [])
    } catch(e) {
      setError(e.message)
    } finally {
      setTL(false)
    }
  }

  async function handleEnroll(courseId) {
    setEnrolling(courseId)
    setError('')
    try {
      await api.enrollCourse(courseId)
      const r = await api.courses()
      const updatedList = r.courses || r || []
      setCourses(updatedList)
      const updatedCourse = updatedList.find(c => c.id === courseId)
      if (updatedCourse) {
        setOpenCourse(updatedCourse)
      } else if (openCourse) {
        setOpenCourse(prev => ({ ...prev, is_enrolled: 1, enrolled: true }))
      }
    } catch(e) {
      setError(e.message)
    } finally {
      setEnrolling(null)
    }
  }

  async function handleStart(test) {
    setStarting(test.id)
    setError('')
    try {
      const r = await api.startAttempt(test.id)
      onStartExam({ ...r, testTitle: test.title })
    } catch(e) {
      setError(e.message)
    } finally {
      setStarting(null)
    }
  }

  if (loading) return <div style={{display:'flex',justifyContent:'center',padding:60}}><div className="spinner" /></div>

  if (openCourse) {
    const isEnrolled = Boolean(openCourse.is_enrolled || openCourse.enrolled)
    const isSelfEnroll = openCourse.is_self_enroll !== 0

    return (
      <div>
        <button className="btn btn-outline btn-sm" style={{marginBottom:20}} onClick={() => { setOpenCourse(null); setError('') }}>
          ← Back to Courses
        </button>

        {error && <div className="error-box">{error}</div>}

        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8,flexWrap:'wrap'}}>
          <h1 className="page-title" style={{marginBottom:0}}>{openCourse.title || openCourse.name}</h1>
          {isEnrolled ? (
            <span className="badge badge-success">✓ Enrolled</span>
          ) : isSelfEnroll ? (
            <span className="badge badge-primary">Open to Enroll</span>
          ) : (
            <span className="badge badge-warning">Admin Assigned</span>
          )}
        </div>

        {openCourse.description && (
          <p className="text-muted" style={{marginBottom:20,fontSize:14,lineHeight:1.6}}>{openCourse.description}</p>
        )}

        {/* Enrollment Action Card */}
        {!isEnrolled && (
          <div className="card" style={{marginBottom:24,borderLeft:'4px solid var(--primary)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
            <div>
              <div className="fw-bold" style={{fontSize:15,marginBottom:4}}>
                {isSelfEnroll ? 'Enroll to Unlock Tests' : '🔒 Admin Enrollment Required'}
              </div>
              <div className="text-muted text-sm">
                {isSelfEnroll
                  ? 'Click Enroll below to instantly get free access to all tests in this series.'
                  : 'This batch is assigned by institute administrators. Please contact your admin/teacher to get enrolled.'}
              </div>
            </div>
            {isSelfEnroll && (
              <button
                className="btn btn-primary"
                onClick={() => handleEnroll(openCourse.id)}
                disabled={enrolling === openCourse.id}
              >
                {enrolling === openCourse.id ? 'Enrolling…' : 'Enroll Now (Free)'}
              </button>
            )}
          </div>
        )}

        {testsLoading ? (
          <div style={{display:'flex',justifyContent:'center',padding:40}}><div className="spinner" /></div>
        ) : (
          <div>
            <div className="section-title">📋 Tests ({tests.length})</div>
            {tests.length === 0 && <p className="text-muted">No tests available in this course yet.</p>}
            <div className="tests-list">
              {tests.map(t => (
                <div key={t.id} className="test-row">
                  <div>
                    <div className="test-name">{t.title}</div>
                    <div className="test-meta">⏱ {t.durationMinutes} min &nbsp;·&nbsp; {t.questionCount || 100} questions</div>
                  </div>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    {t.lastAttemptId && (
                      <button className="btn btn-outline btn-sm" onClick={() => onReview(t.lastAttemptId)}>
                        Review
                      </button>
                    )}
                    {isEnrolled ? (
                      <button className="btn btn-primary btn-sm" onClick={() => handleStart(t)} disabled={starting === t.id}>
                        {starting === t.id ? 'Starting…' : t.lastAttemptId ? 'Retake Test' : 'Start Test'}
                      </button>
                    ) : (
                      <span className="text-muted text-xs" style={{fontStyle:'italic'}}>
                        {isSelfEnroll ? 'Enroll to take test' : 'Admin assigned only'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div>
          <h1 className="page-title" style={{marginBottom:4}}>📚 Test Series Courses</h1>
          <p className="text-muted text-sm">Select a course to practice timed tests and track your progress.</p>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      {courses.length === 0 && (
        <div className="card" style={{textAlign:'center',padding:40}}>
          <p className="text-muted">No courses available yet. Please check back later!</p>
        </div>
      )}

      <div className="courses-grid">
        {courses.map(c => {
          const isEnrolled = Boolean(c.is_enrolled || c.enrolled)
          const isSelfEnroll = c.is_self_enroll !== 0

          return (
            <div key={c.id} className="course-card">
              <div className="flex items-center justify-between" style={{marginBottom:10}}>
                <span className="badge badge-primary" style={{fontSize:11}}>{c.category || 'General'}</span>
                {isEnrolled ? (
                  <span className="badge badge-success">✓ Enrolled</span>
                ) : isSelfEnroll ? (
                  <span className="badge badge-primary">Open to Enroll</span>
                ) : (
                  <span className="badge badge-warning">Admin Batch</span>
                )}
              </div>

              <div className="course-name">{c.title || c.name}</div>
              <div className="course-desc">{c.description || 'Practice full-length timed mock tests with instant result analysis.'}</div>

              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:14,paddingTop:12,borderTop:'1px solid var(--border)'}}>
                <span className="text-muted text-xs fw-bold">
                  {c.test_count != null ? `${c.test_count} Tests` : 'Mock Tests'}
                </span>
                <button className="btn btn-primary btn-sm" onClick={() => openCourseTests(c)}>
                  {isEnrolled ? 'View Tests →' : isSelfEnroll ? 'Enroll & View →' : 'View Details →'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
