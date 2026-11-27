import { useState } from 'react'
import { api, setToken } from '../api'

export default function AuthPage({ onLogin }) {
  const [mode, setMode]       = useState('login')
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [phone, setPhone]     = useState('')
  const [password, setPass]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      let res
      if (mode === 'login') {
        res = await api.login(email.trim(), password)
      } else {
        res = await api.register({ name: name.trim(), email: email.trim(), phone: phone.trim(), password })
      }
      if (res.user?.role !== 'student') throw new Error('Please use a Student account.')
      onLogin(res.user, res.token)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">⚡ ExamPulse</div>
        <div className="auth-sub">Student Portal — Practice. Track. Excel.</div>

        <div className="tab-row">
          <button className={`tab-btn ${mode === 'login' ? 'active' : ''}`} onClick={() => { setMode('login'); setError('') }}>Login</button>
          <button className={`tab-btn ${mode === 'register' ? 'active' : ''}`} onClick={() => { setMode('register'); setError('') }}>Register</button>
        </div>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Aarav Sharma" required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone (Optional)</label>
                <input className="form-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="9876543210" type="tel" />
              </div>
            </>
          )}
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="student@example.com" type="email" required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" value={password} onChange={e => setPass(e.target.value)} placeholder="Min 6 characters" type="password" required minLength={6} />
          </div>
          <button className="btn btn-primary w-full" style={{ marginTop:8 }} disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <button className="demo-btn" onClick={() => { setMode('login'); setEmail('student@testseries.app'); setPass('Student@123'); setError('') }}>
          🎓 Fill Demo Student Credentials
        </button>
      </div>
    </div>
  )
}
