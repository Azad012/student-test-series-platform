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
    for (const q of questions) {
      map[q.id] = { selectedOption: null, isMarkedForReview: false }
    }
    for (const sa of session.savedAnswers || []) {
      map[sa.question_id] = {
        selectedOption: sa.selected_option || null,
        isMarkedForReview: Boolean(sa.is_marked_for_review),
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

  async function persistAnswer(qId, nextState) {
    try {
      await api.saveAnswer(attemptId, {
        questionId: qId,
        selectedOption: nextState.selectedOption,
        isMarkedForReview: nextState.isMarkedForReview,
        isVisited: true,
      })
    } catch (err) {
      if (err.message && err.message.includes('auto-submitted')) {
        onSubmitted(attemptId)
      }
    }
  }

  function selectOption(qId, key) {
    const currentItem = answers[qId] || { selectedOption: null, isMarkedForReview: false }
    const newOption = currentItem.selectedOption === key ? null : key
    const nextState = { ...currentItem, selectedOption: newOption }
    setAnswers(a => ({ ...a, [qId]: nextState }))
    persistAnswer(qId, nextState)
  }

  function toggleMarkForReview(qId) {
    const currentItem = answers[qId] || { selectedOption: null, isMarkedForReview: false }
    const nextMarked = !currentItem.isMarkedForReview
    const nextState = { ...currentItem, isMarkedForReview: nextMarked }
    setAnswers(a => ({ ...a, [qId]: nextState }))
    persistAnswer(qId, nextState)
  }

  function markAndNext(qId) {
    const currentItem = answers[qId] || { selectedOption: null, isMarkedForReview: false }
    const nextState = { ...currentItem, isMarkedForReview: true }
    setAnswers(a => ({ ...a, [qId]: nextState }))
    persistAnswer(qId, nextState)
    if (current < total - 1) {
      setCurrent(c => c + 1)
    }
  }

  const q = questions[current]
  const qState = q ? (answers[q.id] || { selectedOption: null, isMarkedForReview: false }) : {}
  const urgent = timeLeft < 120

  const currentOptions = q ? [
    { key: 'A', text: q.option_a },
    { key: 'B', text: q.option_b },
    { key: 'C', text: q.option_c },
    { key: 'D', text: q.option_d },
  ].filter(opt => opt.text !== undefined && opt.text !== null && opt.text !== '') : []

  // Count stats for summary
  const answeredCount = Object.values(answers).filter(st => st.selectedOption).length
  const markedCount = Object.values(answers).filter(st => st.isMarkedForReview).length
  const unansweredCount = total - answeredCount

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
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:8}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <span className="q-number" style={{marginBottom:0}}>Question {current + 1} of {total}</span>
                {q.subject && (
                  <span className="badge" style={{background:'rgba(255,255,255,.12)',color:'#E2E8F0',fontSize:12}}>
                    {q.subject}
                  </span>
                )}
              </div>

              {/* Mark for review toggle */}
              <button
                type="button"
                className={`btn-mark ${qState.isMarkedForReview ? 'active' : ''}`}
                onClick={() => toggleMarkForReview(q.id)}
              >
                {qState.isMarkedForReview ? '🟣 Marked for Review' : '🏷️ Mark for Review'}
              </button>
            </div>

            <div className="q-text" style={{whiteSpace:'pre-wrap'}}>
              {q.question_text || q.text || q.question || 'Question content loading…'}
            </div>

            <div className="options-list">
              {currentOptions.map(opt => {
                const isSelected = qState.selectedOption === opt.key
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

            {/* Sub-actions: Clear response & Mark & Next */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:14,flexWrap:'wrap',gap:8}}>
              <div>
                {qState.selectedOption && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{background:'transparent',color:'rgba(255,255,255,.65)',border:'1px dashed rgba(255,255,255,.3)',padding:'5px 12px',fontSize:12}}
                    onClick={() => selectOption(q.id, qState.selectedOption)}
                  >
                    ✕ Clear Response
                  </button>
                )}
              </div>

              <button
                type="button"
                className="btn-mark"
                style={{fontSize:12.5,padding:'6px 14px'}}
                onClick={() => markAndNext(q.id)}
              >
                🏷️ Mark &amp; Next →
              </button>
            </div>

            {/* Navigation buttons */}
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

        {/* Question Palette with Status Legend */}
        <div style={{marginTop:32,paddingTop:20,borderTop:'1px solid rgba(255,255,255,.1)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10,flexWrap:'wrap',gap:8}}>
            <div style={{fontSize:13,opacity:.8,fontWeight:700}}>Question Palette</div>
          </div>

          <div className="palette-legend">
            <div className="legend-item">
              <div className="legend-dot" style={{background:'#059669'}} />
              <span>Answered ({answeredCount})</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{background:'#7C3AED'}} />
              <span>Marked for Review ({markedCount})</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{background:'#7C3AED',boxShadow:'0 0 0 2px #10B981 inset'}} />
              <span>Answered &amp; Marked</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{background:'rgba(255,255,255,.15)'}} />
              <span>Unanswered ({unansweredCount})</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{background:'transparent',outline:'2px solid #FCD34D'}} />
              <span>Current</span>
            </div>
          </div>

          <div className="q-palette">
            {questions.map((qn, i) => {
              const st = answers[qn.id] || {}
              const isAns = Boolean(st.selectedOption)
              const isMarked = Boolean(st.isMarkedForReview)

              let dotClass = 'unanswered'
              if (isMarked && isAns) {
                dotClass = 'marked-answered'
              } else if (isMarked) {
                dotClass = 'marked'
              } else if (isAns) {
                dotClass = 'answered'
              }

              if (i === current) {
                dotClass += ' current'
              }

              return (
                <button
                  key={qn.id || i}
                  className={`q-dot ${dotClass}`}
                  onClick={() => setCurrent(i)}
                  title={`Question ${i+1}: ${isMarked ? 'Marked for Review' : isAns ? 'Answered' : 'Not Answered'}`}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{marginTop:36,textAlign:'center'}}>
          <button
            className="btn"
            style={{background:'#059669',color:'#fff',border:'none',padding:'12px 42px',fontSize:15,fontWeight:700}}
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
