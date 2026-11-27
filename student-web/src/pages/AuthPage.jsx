import { useState, useEffect } from 'react'
import { api } from '../api'

export default function AuthPage({ onLogin, initialMode = 'login', onBack }) {
  const [mode, setMode]           = useState(initialMode) // 'login' | 'register' | 'forgot'
  const [name, setName]           = useState('')
  const [email, setEmail]         = useState('')
  const [phone, setPhone]         = useState('')
  const [password, setPass]       = useState('')
  const [newPassword, setNewPass] = useState('')
  const [otp, setOtp]             = useState('')
  const [otpStep, setOtpStep]     = useState(false) // true once OTP is sent
  const [resendSec, setResendSec] = useState(0)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [info, setInfo]           = useState('')

  useEffect(() => {
    if (resendSec <= 0) return
    const t = setTimeout(() => setResendSec(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendSec])

  function switchMode(nextMode) {
    setMode(nextMode)
    setOtpStep(false)
    setOtp('')
    setError('')
    setInfo('')
  }

  async function handleLogin(e) {
    e.preventDefault()
    setError(''); setInfo(''); setLoading(true)
    try {
      const res = await api.login(email.trim(), password)
      if (res.user?.role !== 'student') throw new Error('Please use a Student account.')
      onLogin(res.user, res.token)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSendRegisterOtp(e) {
    if (e) e.preventDefault()
    setError(''); setInfo(''); setLoading(true)
    try {
      const res = await api.sendRegisterOtp({ name: name.trim(), email: email.trim() })
      setOtpStep(true)
      setResendSec(30)
      if (res.devOtp) {
        setInfo(`Demo Mode (SMTP not configured): Your OTP is ${res.devOtp}`)
      } else {
        setInfo(`A 6-digit OTP has been sent to ${email.trim()}.`)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyRegister(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const res = await api.register({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        otp: otp.trim(),
      })
      if (res.user?.role !== 'student') throw new Error('Please use a Student account.')
      onLogin(res.user, res.token)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSendForgotOtp(e) {
    if (e) e.preventDefault()
    setError(''); setInfo(''); setLoading(true)
    try {
      const res = await api.sendForgotOtp(email.trim())
      setOtpStep(true)
      setResendSec(30)
      if (res.devOtp) {
        setInfo(`Demo Mode (SMTP not configured): Your Reset OTP is ${res.devOtp}`)
      } else {
        setInfo(`Password reset OTP sent to ${email.trim()}.`)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const res = await api.resetPassword({
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
      })
      setMode('login')
      setOtpStep(false)
      setOtp('')
      setNewPass('')
      setPass('')
      setInfo(res.message || 'Password reset successfully! Please sign in.')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        {onBack && (
          <button
            type="button"
            className="btn btn-sm"
            style={{ background: 'transparent', color: 'var(--muted)', padding: '0 0 12px', fontSize: 13 }}
            onClick={onBack}
          >
            ← Back to Home
          </button>
        )}
        <div className="auth-logo">⚡ ExamPulse</div>
        <div className="auth-sub">Student Portal — Practice. Track. Excel.</div>

        {mode !== 'forgot' && (
          <div className="tab-row">
            <button
              type="button"
              className={`tab-btn ${mode === 'login' ? 'active' : ''}`}
              onClick={() => switchMode('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={`tab-btn ${mode === 'register' ? 'active' : ''}`}
              onClick={() => switchMode('register')}
            >
              Register
            </button>
          </div>
        )}

        {mode === 'forgot' && (
          <div style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--navy)' }}>Reset Password via Email OTP</h3>
            <p className="text-sm text-muted">Verify your email to set a new password.</p>
          </div>
        )}

        {error && <div className="error-box">{error}</div>}
        {info && <div className="success-box">{info}</div>}

        {/* LOGIN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="student@example.com" type="email" required />
            </div>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12.5, fontWeight: 600, padding: 0 }}
                  onClick={() => switchMode('forgot')}
                >
                  Forgot Password?
                </button>
              </div>
              <input className="form-input" style={{ marginTop: 6 }} value={password} onChange={e => setPass(e.target.value)} placeholder="Min 6 characters" type="password" required minLength={6} />
            </div>
            <button className="btn btn-primary w-full" style={{ marginTop: 8 }} disabled={loading}>
              {loading ? 'Please wait…' : 'Sign In'}
            </button>
          </form>
        )}

        {/* REGISTER FORM (WITH EMAIL OTP) */}
        {mode === 'register' && !otpStep && (
          <form onSubmit={handleSendRegisterOtp}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Aarav Sharma" required />
            </div>
            <div className="form-group">
              <label className="form-label">Phone (Optional)</label>
              <input className="form-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="9876543210" type="tel" />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="student@example.com" type="email" required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" value={password} onChange={e => setPass(e.target.value)} placeholder="Min 6 characters" type="password" required minLength={6} />
            </div>
            <button className="btn btn-primary w-full" style={{ marginTop: 8 }} disabled={loading}>
              {loading ? 'Sending OTP…' : 'Send Email OTP →'}
            </button>
          </form>
        )}

        {mode === 'register' && otpStep && (
          <form onSubmit={handleVerifyRegister}>
            <div className="form-group">
              <label className="form-label">Enter 6-Digit Email OTP</label>
              <input
                className="form-input"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                inputMode="numeric"
                maxLength={6}
                required
                style={{ letterSpacing: 6, fontSize: 18, fontWeight: 700, textAlign: 'center' }}
              />
            </div>
            <button className="btn btn-primary w-full" style={{ marginTop: 8 }} disabled={loading || otp.length !== 6}>
              {loading ? 'Verifying…' : 'Verify OTP & Create Account'}
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 13 }}>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--muted)' }}
                onClick={() => { setOtpStep(false); setOtp(''); setError(''); setInfo('') }}
              >
                ← Change Details
              </button>
              <button
                type="button"
                disabled={resendSec > 0 || loading}
                style={{ background: 'none', border: 'none', color: resendSec > 0 ? 'var(--muted)' : 'var(--primary)', fontWeight: 600 }}
                onClick={() => handleSendRegisterOtp()}
              >
                {resendSec > 0 ? `Resend OTP in ${resendSec}s` : 'Resend OTP'}
              </button>
            </div>
          </form>
        )}

        {/* FORGOT PASSWORD FORM (WITH EMAIL OTP) */}
        {mode === 'forgot' && !otpStep && (
          <form onSubmit={handleSendForgotOtp}>
            <div className="form-group">
              <label className="form-label">Registered Email Address</label>
              <input className="form-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="student@example.com" type="email" required />
            </div>
            <button className="btn btn-primary w-full" style={{ marginTop: 8 }} disabled={loading}>
              {loading ? 'Sending OTP…' : 'Send Reset OTP →'}
            </button>
            <button
              type="button"
              className="btn btn-sm w-full"
              style={{ marginTop: 10, background: 'transparent', color: 'var(--muted)' }}
              onClick={() => switchMode('login')}
            >
              ← Back to Login
            </button>
          </form>
        )}

        {mode === 'forgot' && otpStep && (
          <form onSubmit={handleResetPassword}>
            <div className="form-group">
              <label className="form-label">Enter 6-Digit Email OTP</label>
              <input
                className="form-input"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                inputMode="numeric"
                maxLength={6}
                required
                style={{ letterSpacing: 6, fontSize: 18, fontWeight: 700, textAlign: 'center' }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                className="form-input"
                value={newPassword}
                onChange={e => setNewPass(e.target.value)}
                placeholder="Min 6 characters"
                type="password"
                minLength={6}
                required
              />
            </div>
            <button className="btn btn-primary w-full" style={{ marginTop: 8 }} disabled={loading || otp.length !== 6}>
              {loading ? 'Resetting…' : 'Verify OTP & Reset Password'}
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 13 }}>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--muted)' }}
                onClick={() => switchMode('login')}
              >
                ← Back to Login
              </button>
              <button
                type="button"
                disabled={resendSec > 0 || loading}
                style={{ background: 'none', border: 'none', color: resendSec > 0 ? 'var(--muted)' : 'var(--primary)', fontWeight: 600 }}
                onClick={() => handleSendForgotOtp()}
              >
                {resendSec > 0 ? `Resend OTP in ${resendSec}s` : 'Resend OTP'}
              </button>
            </div>
          </form>
        )}

        {mode === 'login' && (
          <button
            type="button"
            className="demo-btn"
            onClick={() => { setMode('login'); setEmail('student@testseries.app'); setPass('Student@123'); setError(''); setInfo('') }}
          >
            🎓 Fill Demo Student Credentials
          </button>
        )}
      </div>
    </div>
  )
}
