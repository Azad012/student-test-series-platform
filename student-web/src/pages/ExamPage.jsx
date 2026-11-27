import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { api } from '../api'
import { translateQuestionToHindi, isNonTranslatableSubject } from '../utils/translator'

function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec))
  const m = Math.floor(s / 60), r = s % 60
  return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`
}

function formatQText(text) {
  if (!text) return ''
  return String(text).replace(/^Q\d+\.\s*/i, '')
}

export default function ExamPage({ session, onSubmitted, onExit }) {
  const attemptId = session.attempt?.id || session.attemptId
  const testTitle = session.test?.title || session.testTitle || 'Exam'

  // Standard Subject Ordering (Continuous sections)
  const orderRank = useMemo(() => ({
    'quantitative aptitude': 1,
    'quant': 1,
    'math': 1,
    'mathematics': 1,
    'logical reasoning': 2,
    'reasoning': 2,
    'general intelligence': 2,
    'verbal ability': 3,
    'english': 3,
    'english comprehension': 3,
    'general science': 4,
    'general awareness': 4,
    'science': 4,
  }), [])

  // Order questions continuously by subject: 1-25 Quant, 26-50 Reasoning, 51-75 Verbal, 76-100 Science
  const questions = useMemo(() => {
    const raw = session.questions || []
    return [...raw].sort((a, b) => {
      const sA = (a.subject || 'General').toLowerCase().trim()
      const sB = (b.subject || 'General').toLowerCase().trim()
      const rankA = orderRank[sA] || 99
      const rankB = orderRank[sB] || 99
      if (rankA !== rankB) return rankA - rankB
      if (sA !== sB) return sA.localeCompare(sB)
      return (a.order_index ?? a.id ?? 0) - (b.order_index ?? b.id ?? 0)
    })
  }, [session.questions, orderRank])

  const total = questions.length

  const initialTime = session.remainingSeconds ?? session.durationSeconds ?? (session.test?.duration_minutes ? session.test.duration_minutes * 60 : 3600)

  const [current, setCurrent]   = useState(0)
  const [lang, setLang]         = useState(() => localStorage.getItem('exam_lang') || 'en')
  const [paletteFilter, setPaletteFilter] = useState('all') // 'all' | 'answered' | 'marked' | 'unanswered'
  const [paletteScope, setPaletteScope] = useState('section') // 'section' | 'all'
  const [sectionDropOpen, setSectionDropOpen] = useState(false)
  const sectionDropRef = useRef(null)
  const [translatedMap, setTranslatedMap] = useState({})
  const [translating, setTranslating] = useState(false)

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

  // Derive unique sections (subjects) from questions
  const sections = useMemo(() => {
    const map = new Map()
    questions.forEach((qn, index) => {
      const subj = qn.subject || 'General'
      if (!map.has(subj)) {
        map.set(subj, { name: subj, startIndex: index, questionIndices: [] })
      }
      map.get(subj).questionIndices.push(index)
    })
    return Array.from(map.values())
  }, [questions])

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

  const q = questions[current]
  const activeSectionName = q?.subject || 'General'

  // Close section dropdown when clicking outside
  useEffect(() => {
    function handleOutside(e) {
      if (sectionDropRef.current && !sectionDropRef.current.contains(e.target)) {
        setSectionDropOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  // Handle translation when Hindi is toggled or when navigating
  useEffect(() => {
    try { localStorage.setItem('exam_lang', lang) } catch {}
    if (lang === 'hi' && q && !translatedMap[q.id] && !isNonTranslatableSubject(q.subject)) {
      setTranslating(true)
      translateQuestionToHindi(q)
        .then(tQ => {
          setTranslatedMap(m => ({ ...m, [q.id]: tQ }))
        })
        .finally(() => setTranslating(false))
    }
  }, [lang, current, q?.id])

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

  function clearResponse(qId) {
    const currentItem = answers[qId] || { selectedOption: null, isMarkedForReview: false }
    const nextState = { ...currentItem, selectedOption: null }
    setAnswers(a => ({ ...a, [qId]: nextState }))
    persistAnswer(qId, nextState)
  }

  function saveAndNext(qId) {
    const currentItem = answers[qId] || { selectedOption: null, isMarkedForReview: false }
    persistAnswer(qId, currentItem)
    if (current < total - 1) {
      setCurrent(c => c + 1)
    }
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

  const qState = q ? (answers[q.id] || { selectedOption: null, isMarkedForReview: false }) : {}
  const urgent = timeLeft < 120

  // If language is Hindi and we have translated version, use it
  const displayQ = (lang === 'hi' && translatedMap[q?.id]) ? translatedMap[q.id] : q

  const currentOptions = displayQ ? [
    { key: 'A', text: displayQ.option_a },
    { key: 'B', text: displayQ.option_b },
    { key: 'C', text: displayQ.option_c },
    { key: 'D', text: displayQ.option_d },
  ].filter(opt => opt.text !== undefined && opt.text !== null && opt.text !== '') : []

  // Count stats for summary
  const answeredCount = Object.values(answers).filter(st => st.selectedOption).length
  const markedCount = Object.values(answers).filter(st => st.isMarkedForReview).length
  const unansweredCount = total - answeredCount

  // Filter questions based on scope (Section vs All) and filter pill
  const scopeQuestions = useMemo(() => {
    if (paletteScope === 'all' || sections.length <= 1) {
      return questions.map((qn, i) => ({ qn, index: i }))
    }
    const currentSec = sections.find(s => s.name === activeSectionName)
    if (!currentSec) return questions.map((qn, i) => ({ qn, index: i }))
    return currentSec.questionIndices.map(i => ({ qn: questions[i], index: i }))
  }, [paletteScope, sections, activeSectionName, questions])

  const filteredQuestions = useMemo(() => {
    return scopeQuestions.filter(({ qn }) => {
      const st = answers[qn.id] || {}
      const isAns = Boolean(st.selectedOption)
      const isMarked = Boolean(st.isMarkedForReview)

      if (paletteFilter === 'answered') return isAns
      if (paletteFilter === 'marked') return isMarked
      if (paletteFilter === 'unanswered') return !isAns
      return true
    })
  }, [scopeQuestions, paletteFilter, answers])

  return (
    <div className="exam-wrap">
      <div className="exam-header">
        <div>
          <div style={{fontSize:13,opacity:.6}}>Exam in Progress</div>
          <div style={{fontWeight:700,fontSize:16}}>{testTitle}</div>
        </div>

        {/* Language Toggle: English <-> Hindi */}
        <div className="lang-toggle-wrap">
          <div className="lang-toggle">
            <button
              type="button"
              className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
              onClick={() => setLang('en')}
            >
              English
            </button>
            <button
              type="button"
              className={`lang-btn ${lang === 'hi' ? 'active' : ''}`}
              onClick={() => setLang('hi')}
            >
              हिन्दी
            </button>
          </div>
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

        {/* SSC CBT Section Dropdown (When test has multiple subjects) */}
        {sections.length > 1 && (
          <div className="section-dropdown-wrap" ref={sectionDropRef}>
            <button
              type="button"
              className="section-dropdown-btn"
              onClick={() => setSectionDropOpen(o => !o)}
            >
              <span style={{fontSize:12,opacity:.6,fontWeight:800,letterSpacing:'.5px',textTransform:'uppercase'}}>📑 Section:</span>
              <span style={{fontWeight:700,flex:1,textAlign:'left'}}>{activeSectionName}</span>
              {(() => {
                const sec = sections.find(s => s.name === activeSectionName)
                if (!sec) return null
                const secAns = sec.questionIndices.filter(i => answers[questions[i]?.id]?.selectedOption).length
                const secTot = sec.questionIndices.length
                return (
                  <span className={`sec-badge ${secAns === secTot ? 'done' : ''}`}>
                    {secAns}/{secTot}
                  </span>
                )
              })()}
              <span style={{marginLeft:4,fontSize:12,opacity:.7}}>{sectionDropOpen ? '▴' : '▾'}</span>
            </button>

            {sectionDropOpen && (
              <div className="section-dropdown-menu">
                {sections.map(sec => {
                  const isActive = activeSectionName === sec.name
                  const secAnswered = sec.questionIndices.filter(i => answers[questions[i]?.id]?.selectedOption).length
                  const secTotal = sec.questionIndices.length
                  return (
                    <button
                      key={sec.name}
                      type="button"
                      className={`section-dropdown-item ${isActive ? 'active' : ''}`}
                      onClick={() => { setCurrent(sec.startIndex); setSectionDropOpen(false) }}
                    >
                      <span style={{fontWeight:700}}>{sec.name}</span>
                      <span className={`sec-badge ${secAnswered === secTotal ? 'done' : ''}`}>
                        {secAnswered}/{secTotal}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {displayQ ? (
          <>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:8}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <span className="q-number" style={{marginBottom:0}}>Question {current + 1} of {total}</span>
                {displayQ.subject && (
                  <span className="badge" style={{background:'rgba(255,255,255,.12)',color:'#E2E8F0',fontSize:12}}>
                    {displayQ.subject}
                  </span>
                )}
                {qState.isMarkedForReview && (
                  <span className="badge" style={{background:'rgba(124,58,237,.35)',color:'#DDD6FE',border:'1px solid #8B5CF6',fontSize:11.5}}>
                    🟣 Marked for Review
                  </span>
                )}
                {lang === 'hi' && translating && (
                  <span className="badge" style={{background:'rgba(254,240,138,.2)',color:'#FDE047',fontSize:11}}>
                    🔄 अनुवाद हो रहा है...
                  </span>
                )}
              </div>
            </div>

            <div className="q-text" style={{whiteSpace:'pre-wrap'}}>
              {formatQText(displayQ.question_text || displayQ.text || displayQ.question || 'Question content loading…')}
            </div>

            <div className="options-list">
              {currentOptions.map(opt => {
                const isSelected = qState.selectedOption === opt.key
                return (
                  <button
                    key={opt.key}
                    type="button"
                    className={`option-btn${isSelected ? ' selected' : ''}`}
                    onClick={() => selectOption(displayQ.id, opt.key)}
                  >
                    <span style={{fontWeight:800,marginRight:12,color:isSelected ? '#C7D2FE' : '#94A3B8'}}>
                      ({opt.key})
                    </span>
                    <span>{opt.text}</span>
                  </button>
                )
              })}
            </div>

            {/* Single Unified Action Bar (Previous | Clear | Mark for Review & Next | Save & Next) */}
            <div className="exam-action-bar">
              <div className="exam-action-left">
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{background:'rgba(255,255,255,.12)',color:'#fff',border:'none',padding:'9px 18px',fontSize:13.5,fontWeight:600}}
                  disabled={current === 0}
                  onClick={() => setCurrent(c => c - 1)}
                >
                  ← Previous
                </button>

                {qState.selectedOption && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{background:'transparent',color:'rgba(255,255,255,.65)',border:'1px dashed rgba(255,255,255,.3)',padding:'8px 14px',fontSize:12.5}}
                    onClick={() => clearResponse(displayQ.id)}
                  >
                    ✕ Clear
                  </button>
                )}
              </div>

              <div className="exam-action-right">
                <button
                  type="button"
                  className="btn-mark"
                  style={{padding:'9px 18px',fontSize:13.5,fontWeight:600}}
                  onClick={() => markAndNext(displayQ.id)}
                >
                  🟣 Mark for Review &amp; Next
                </button>

                {current < total - 1 ? (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{padding:'9px 22px',fontSize:13.5,fontWeight:700}}
                    onClick={() => saveAndNext(displayQ.id)}
                  >
                    Save &amp; Next →
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{background:'#059669',color:'#fff',border:'none',fontWeight:700,padding:'9px 24px',fontSize:13.5}}
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

        {/* Question Palette with Interactive Filter Buttons and Scope Switcher */}
        <div style={{marginTop:32,paddingTop:20,borderTop:'1px solid rgba(255,255,255,.1)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10,flexWrap:'wrap',gap:8}}>
            <div style={{fontSize:13,opacity:.85,fontWeight:700}}>
              Question Palette {sections.length > 1 && paletteScope === 'section' ? `• ${activeSectionName}` : '• All Questions'}
            </div>

            {sections.length > 1 && (
              <div style={{display:'flex',gap:6}}>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{
                    background: paletteScope === 'section' ? 'var(--primary)' : 'rgba(255,255,255,.08)',
                    border: '1px solid rgba(255,255,255,.2)',
                    color: '#fff',
                    fontSize: 12,
                    padding: '4px 10px',
                    borderRadius: 6,
                  }}
                  onClick={() => setPaletteScope('section')}
                >
                  Section Only
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{
                    background: paletteScope === 'all' ? 'var(--primary)' : 'rgba(255,255,255,.08)',
                    border: '1px solid rgba(255,255,255,.2)',
                    color: '#fff',
                    fontSize: 12,
                    padding: '4px 10px',
                    borderRadius: 6,
                  }}
                  onClick={() => setPaletteScope('all')}
                >
                  All Questions
                </button>
              </div>
            )}
          </div>

          <div className="palette-filter-row">
            <button
              type="button"
              className={`palette-filter-btn ${paletteFilter === 'all' ? 'active' : ''}`}
              onClick={() => setPaletteFilter('all')}
            >
              All ({scopeQuestions.length})
            </button>

            <button
              type="button"
              className={`palette-filter-btn btn-f-answered ${paletteFilter === 'answered' ? 'active' : ''}`}
              onClick={() => setPaletteFilter(paletteFilter === 'answered' ? 'all' : 'answered')}
            >
              <span className="filter-dot dot-answered" />
              Answered ({answeredCount})
            </button>

            <button
              type="button"
              className={`palette-filter-btn btn-f-marked ${paletteFilter === 'marked' ? 'active' : ''}`}
              onClick={() => setPaletteFilter(paletteFilter === 'marked' ? 'all' : 'marked')}
            >
              <span className="filter-dot dot-marked" />
              Marked for Review ({markedCount})
            </button>

            <button
              type="button"
              className={`palette-filter-btn btn-f-unanswered ${paletteFilter === 'unanswered' ? 'active' : ''}`}
              onClick={() => setPaletteFilter(paletteFilter === 'unanswered' ? 'all' : 'unanswered')}
            >
              <span className="filter-dot dot-unanswered" />
              Unanswered ({unansweredCount})
            </button>
          </div>

          <div className="q-palette">
            {filteredQuestions.length === 0 ? (
              <div style={{color:'rgba(255,255,255,.55)',fontSize:13,padding:'12px 4px',fontStyle:'italic'}}>
                No questions found under this filter.
              </div>
            ) : (
              filteredQuestions.map(({ qn, index }) => {
                const st = answers[qn.id] || {}
                const isAns = Boolean(st.selectedOption)
                const isMarked = Boolean(st.isMarkedForReview)

                let dotClass = 'unanswered'
                if (isMarked) {
                  dotClass = 'marked'
                } else if (isAns) {
                  dotClass = 'answered'
                }

                if (index === current) {
                  dotClass += ' current'
                }

                return (
                  <button
                    key={qn.id || index}
                    className={`q-dot ${dotClass}`}
                    onClick={() => setCurrent(index)}
                    title={`Q${index + 1} (${qn.subject || 'General'}): ${isMarked ? 'Marked for Review' : isAns ? 'Answered' : 'Not Answered'}`}
                  >
                    {index + 1}
                  </button>
                )
              })
            )}
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
