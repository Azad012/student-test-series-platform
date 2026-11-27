import { useState, useEffect } from 'react'
import { api, setToken, getToken } from './api'
import AuthPage from './pages/AuthPage'
import LandingPage from './pages/LandingPage'
import CoursesPage from './pages/CoursesPage'
import ExamPage from './pages/ExamPage'
import ResultPage from './pages/ResultPage'
import DashboardPage from './pages/DashboardPage'
import ProfilePage from './pages/ProfilePage'
import Navbar from './components/Navbar'
import './App.css'

export default function App() {
  const [user, setUser]               = useState(null)
  const [loading, setLoading]         = useState(true)
  const [showAuth, setShowAuth]       = useState(false)
  const [authMode, setAuthMode]       = useState('login')
  const [page, setPage]               = useState('courses')   // courses | dashboard | profile
  const [examSession, setExamSession] = useState(null)        // active exam
  const [reviewId, setReviewId]       = useState(null)        // attempt to review

  useEffect(() => {
    if (getToken()) {
      api.me()
        .then(r => { if (r.user?.role === 'student') setUser(r.user) })
        .catch(() => setToken(''))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  function handleLogin(userData, tok) {
    setToken(tok)
    setUser(userData)
  }

  function handleLogout() {
    setToken('')
    setUser(null)
    setPage('courses')
    setExamSession(null)
    setReviewId(null)
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
      <div className="spinner" />
    </div>
  )

  if (!user) {
    if (!showAuth) {
      return (
        <LandingPage
          onOpenAuth={(mode = 'login') => {
            setAuthMode(mode)
            setShowAuth(true)
          }}
        />
      )
    }
    return (
      <AuthPage
        initialMode={authMode}
        onLogin={handleLogin}
        onBack={() => setShowAuth(false)}
      />
    )
  }

  if (examSession) return (
    <ExamPage
      session={examSession}
      onSubmitted={attemptId => { setExamSession(null); setReviewId(attemptId) }}
      onExit={() => setExamSession(null)}
    />
  )

  if (reviewId) return (
    <ResultPage attemptId={reviewId} onBack={() => setReviewId(null)} />
  )

  return (
    <div className="app-shell">
      <Navbar user={user} page={page} setPage={setPage} onLogout={handleLogout} />
      <main className="app-main">
        {page === 'courses'   && <CoursesPage   onStartExam={setExamSession} onReview={setReviewId} />}
        {page === 'dashboard' && <DashboardPage onReview={setReviewId} />}
        {page === 'profile'   && <ProfilePage   user={user} onLogout={handleLogout} />}
      </main>
    </div>
  )
}
