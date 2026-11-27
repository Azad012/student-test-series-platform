import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../api'

function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec))
  const m = Math.floor(s / 60), r = s % 60
  return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`
}

export default function ExamPage({ session, onSubmitted, onExit }) {
  const attemptId = session.attempt?.id || session.attemptId
  const testTitle = session.test?.title || session.testTitle || 'Exam'
  const questions = session.questions || []
  const total = questions.length

  const initialTime = session.remainingSeconds ?? session.durationSeconds ?? (session.test?.duration_minutes ? session.test.duration_minutes * 60 : 3600)

  const [current, setCurrent]   = useState(0)
  const [answers, setAnswers]   = useState(() => {
    const map = {}
    for (const sa of session.savedAnswers || []) {
      if (sa.selected_option) {
        map[sa.question_id] = sa.selected_option
      }
    }
    return map
  })
  const [timeLeft, setTimeLeft] = useState(initialTime)
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
    } catch(e) {
      setError(e.message)
      setSub(false)
    }
  }, [attemptId, submitting, onSubmitted])

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          submit()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [submit])

  async function selectOption(qId, key) {
    const newKey = answers[qId] === key ? null : key
    setAnswers(a => ({ ...a, [qId]: newKey }))
    try {
      await api.saveAnswer(attemptId, { questionId: qId, selectedOption: newKey })
    } catch (err) {
      if (err.message && err.message.includes('auto-submitted')) {
        onSubmitted(attemptId)
      }
    }
  }

  const q = questions[current]
  const urgent = timeLeft < 120

  // Build options array from option_a, option_b, option_c, option_d or fallback
  const currentOptions = q ? [
    { key: 'A', text: q.option_a },
    { key: 'B', text: q.option_b },
    { key: 'C', text: q.option_c },
    { key: 'D', text: q.option_d },
  ].filter(opt => opt.text !== undefined && opt.text !== null && opt.text !== '') : []

  return (
    <div className="exam-wrap">
      <div className="exam-header">
        <div>
          <div style={{fontSize:13,opacity:.6}}>Exam in Progress</div>
          <div style={{fontWeight:700,fontSize:16}}>{testTitle}</div>
        </div>
        <div className="exam-timer" style={urgent ? {color:'#F87171'} : {}}>
          {urgent ? '⚠️ ' : '⏱ '}{formatTime(timeLeft)}
        </div>
        <button
          className="btn btn-sm"
          style={{background:'rgba(255,255,255,.15)',color:'#fff',border:'none'}}
          onClick={() => { if (window.confirm('Exit exam? Your answered questions are safely saved.')) onExit() }}
        >
          Exit
        </button>
      </div>

      <div className="exam-body">
        {error && <div className="error-box">{error}</div>}

        {q ? (
          <>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <div className="q-number">Question {current + 1} of {total}</div>
              {q.subject && (
                <span className="badge" style={{background:'rgba(255,255,255,.12)',color:'#E2E8F0',fontSize:12}}>
                  {q.subject}
                </span>
              )}
            </div>

            <div className="q-text" style={{whiteSpace:'pre-wrap'}}>
              {q.question_text || q.text || q.question || 'Question content loading…'}
            </div>

            <div className="options-list">
              {currentOptions.map(opt => {
                const isSelected = answers[q.id] === opt.key
                return (
                  <button
                    key={opt.key}
                    type="button"
                    className={`option-btn${isSelected ? ' selected' : ''}`}
                    onClick={() => selectOption(q.id, opt.key)}
                  >
                    <span style={{fontWeight:800,marginRight:12,color:isSelected ? '#C7D2FE' : '#94A3B8'}}>
                      ({opt.key})
                    </span>
                    <span>{opt.text}</span>
                  </button>
                )
              })}
            </div>

            {answers[q.id] && (
              <div style={{marginTop:12}}>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{background:'transparent',color:'rgba(255,255,255,.6)',border:'1px dashed rgba(255,255,255,.3)',padding:'4px 12px',fontSize:12}}
                  onClick={() => selectOption(q.id, answers[q.id])}
                >
                  ✕ Clear Choice
                </button>
              </div>
            )}

            <div className="exam-nav">
              <button
                className="btn btn-sm"
                style={{background:'rgba(255,255,255,.12)',color:'#fff',border:'none'}}
                disabled={current === 0}
                onClick={() => setCurrent(c => c - 1)}
              >
                ← Prev
              </button>

              <div style={{display:'flex',gap:10}}>
                {current < total - 1 ? (
                  <button className="btn btn-primary btn-sm" onClick={() => setCurrent(c => c + 1)}>
                    Next →
                  </button>
                ) : (
                  <button
                    className="btn btn-sm"
                    style={{background:'#059669',color:'#fff',border:'none',fontWeight:700}}
                    onClick={() => { if (window.confirm('Are you sure you want to submit the exam?')) submit() }}
                    disabled={submitting}
                  >
                    {submitting ? 'Submitting…' : '✅ Submit Exam'}
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div style={{padding:40,textAlign:'center',color:'#94A3B8'}}>No questions available in this test.</div>
        )}

        <div style={{marginTop:32,paddingTop:20,borderTop:'1px solid rgba(255,255,255,.1)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <div style={{fontSize:13,opacity:.7,fontWeight:600}}>Question Palette ({Object.keys(answers).filter(k => answers[k]).length}/{total} Answered)</div>
          </div>
          <div className="q-palette">
            {questions.map((qn, i) => {
              const isAns = answers[qn.id] != null
              return (
                <button
                  key={qn.id || i}
                  className={`q-dot ${i === current ? 'current' : isAns ? 'answered' : 'unanswered'}`}
                  onClick={() => setCurrent(i)}
                  title={`Question ${i+1}`}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{marginTop:32,textAlign:'center'}}>
          <button
            className="btn"
            style={{background:'#059669',color:'#fff',border:'none',padding:'12px 40px',fontSize:15,fontWeight:700}}
            onClick={() => { if (window.confirm('Are you sure you want to finish and submit the exam?')) submit() }}
            disabled={submitting}
          >
            {submitting ? 'Submitting…' : '✅ Final Submit Exam'}
          </button>
        </div>
      </div>
    </div>
  )
}
