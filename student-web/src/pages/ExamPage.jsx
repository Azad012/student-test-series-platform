import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../api'

function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec))
  const m = Math.floor(s / 60), r = s % 60
  return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`
}

export default function ExamPage({ session, onSubmitted, onExit }) {
  const { attemptId, questions = [], durationSeconds, testTitle } = session
  const total      = questions.length
  const [current, setCurrent]   = useState(0)
  const [answers, setAnswers]   = useState({})   // { questionId: optionIndex }
  const [timeLeft, setTimeLeft] = useState(durationSeconds || 3600)
  const [submitting, setSub]    = useState(false)
  const [error, setError]       = useState('')
  const timerRef = useRef(null)

  const submit = useCallback(async () => {
    if (submitting) return
    setSub(true)
    clearInterval(timerRef.current)
    try {
      await api.submitAttempt(attemptId)
      onSubmitted(attemptId)
    } catch(e) { setError(e.message); setSub(false) }
  }, [attemptId, submitting, onSubmitted])

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(t => { if (t <= 1) { clearInterval(timerRef.current); submit(); return 0; } return t - 1 })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [submit])

  async function selectOption(qId, idx) {
    setAnswers(a => ({ ...a, [qId]: idx }))
    try { await api.saveAnswer(attemptId, { questionId: qId, selectedOption: idx }) } catch {}
  }

  const q = questions[current]
  const urgent = timeLeft < 120

  return (
    <div className="exam-wrap">
      <div className="exam-header">
        <div>
          <div style={{fontSize:13,opacity:.6}}>Exam</div>
          <div style={{fontWeight:700}}>{testTitle}</div>
        </div>
        <div className="exam-timer" style={urgent ? {color:'#F87171'} : {}}>
          {urgent ? '⚠️ ' : '⏱ '}{formatTime(timeLeft)}
        </div>
        <button className="btn btn-sm" style={{background:'rgba(255,255,255,.1)',color:'#fff',border:'none'}}
          onClick={() => { if (window.confirm('Exit exam? Progress is saved.')) onExit() }}>
          Exit
        </button>
      </div>

      <div className="exam-body">
        {error && <div className="error-box">{error}</div>}
        {q && (
          <>
            <div className="q-number">Question {current + 1} of {total}</div>
            <div className="q-text">{q.text || q.question}</div>
            <div className="options-list">
              {(q.options || []).map((opt, i) => (
                <button key={i}
                  className={`option-btn${answers[q.id] === i ? ' selected' : ''}`}
                  onClick={() => selectOption(q.id, i)}>
                  <span style={{marginRight:10,opacity:.6}}>{String.fromCharCode(65+i)}.</span>{opt}
                </button>
              ))}
            </div>
            <div className="exam-nav">
              <button className="btn btn-sm" style={{background:'rgba(255,255,255,.1)',color:'#fff',border:'none'}}
                disabled={current === 0} onClick={() => setCurrent(c => c - 1)}>← Prev</button>
              {current < total - 1
                ? <button className="btn btn-primary btn-sm" onClick={() => setCurrent(c => c + 1)}>Next →</button>
                : <button className="btn btn-sm" style={{background:'#059669',color:'#fff',border:'none'}}
                    onClick={() => { if (window.confirm('Submit exam?')) submit() }} disabled={submitting}>
                    {submitting ? 'Submitting…' : '✅ Submit'}
                  </button>
              }
            </div>
          </>
        )}

        <div style={{marginTop:28}}>
          <div style={{fontSize:13,opacity:.5,marginBottom:8}}>Question Navigator</div>
          <div className="q-palette">
            {questions.map((qn, i) => (
              <button key={i} className={`q-dot ${i === current ? 'current' : answers[qn.id] !== undefined ? 'answered' : 'unanswered'}`}
                onClick={() => setCurrent(i)}>{i+1}</button>
            ))}
          </div>
        </div>

        <div style={{marginTop:24,textAlign:'center'}}>
          <button className="btn btn-sm" style={{background:'#059669',color:'#fff',border:'none',padding:'10px 32px'}}
            onClick={() => { if (window.confirm('Submit exam?')) submit() }} disabled={submitting}>
            {submitting ? 'Submitting…' : '✅ Submit Exam'}
          </button>
        </div>
      </div>
    </div>
  )
}
