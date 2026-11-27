import { useState, useEffect } from 'react'
import { api } from '../api'
import { translateQuestionToHindi } from '../utils/translator'

export default function ResultPage({ attemptId, onBack }) {
  const [data, setData]       = useState(null)
  const [loading, setLoad]    = useState(true)
  const [error, setError]     = useState('')
  const [lang, setLang]       = useState(() => localStorage.getItem('exam_lang') || 'en')
  const [translatedMap, setTranslatedMap] = useState({})
  const [translating, setTranslating] = useState(false)

  useEffect(() => {
    api.attemptResult(attemptId)
      .then(r => setData(r))
      .catch(e => setError(e.message))
      .finally(() => setLoad(false))
  }, [attemptId])

  // Translate review questions when Hindi is chosen
  useEffect(() => {
    try { localStorage.setItem('exam_lang', lang) } catch {}
    if (lang === 'hi' && data?.questions) {
      const untranslated = data.questions.filter(q => !translatedMap[q.id])
      if (untranslated.length > 0) {
        setTranslating(true)
        Promise.all(untranslated.map(q => translateQuestionToHindi(q).then(tQ => [q.id, tQ])))
          .then(entries => {
            setTranslatedMap(m => ({ ...m, ...Object.fromEntries(entries) }))
          })
          .finally(() => setTranslating(false))
      }
    }
  }, [lang, data?.questions])

  if (loading) return <div style={{display:'flex',justifyContent:'center',padding:80}}><div className="spinner" /></div>
  if (error || !data) {
    return (
      <div style={{padding:24,maxWidth:860,margin:'0 auto'}}>
        <div className="error-box">{error || 'Unable to load test result.'}</div>
        <button className="btn btn-outline" onClick={onBack}>← Back to Dashboard</button>
      </div>
    )
  }

  const attempt = data.attempt || data.result || data
  const test = data.test || {}
  const rawQuestions = data.questions || []

  const maxScore = attempt.max_score ?? attempt.maxMarks ?? (test.marks_correct ? rawQuestions.length * test.marks_correct : 100)
  const score = attempt.score ?? attempt.marks ?? 0
  const correctCount = attempt.correct_count ?? attempt.correct ?? 0
  const wrongCount = attempt.wrong_count ?? attempt.wrong ?? 0
  const skippedCount = attempt.unattempted_count ?? attempt.skipped ?? Math.max(0, rawQuestions.length - correctCount - wrongCount)
  const accuracy = attempt.accuracy != null ? `${attempt.accuracy}%` : `${(correctCount / Math.max(1, correctCount + wrongCount) * 100).toFixed(1)}%`

  const stats = [
    { label:'Final Score', val: `${score}/${maxScore}`, color:'var(--primary)' },
    { label:'Correct',    val: correctCount,           color:'var(--success)' },
    { label:'Wrong',      val: wrongCount,             color:'var(--danger)'  },
    { label:'Skipped',    val: skippedCount,           color:'var(--warning)' },
    { label:'Accuracy',   val: accuracy,               color:'var(--primary)' },
    { label:'Status',     val: attempt.status === 'auto_submitted' ? 'Timeout' : 'Completed', color:'var(--muted)' },
  ]

  return (
    <div style={{maxWidth:860,margin:'0 auto',padding:24}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <button className="btn btn-outline btn-sm" onClick={onBack}>
          ← Back to Courses
        </button>

        {/* Language Toggle */}
        <div className="lang-toggle-wrap">
          <div className="lang-toggle" style={{background:'var(--surface)',border:'1px solid var(--border)'}}>
            <button
              type="button"
              className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
              style={{color: lang === 'en' ? '#fff' : 'var(--muted)'}}
              onClick={() => setLang('en')}
            >
              English
            </button>
            <button
              type="button"
              className={`lang-btn ${lang === 'hi' ? 'active' : ''}`}
              style={{color: lang === 'hi' ? '#fff' : 'var(--muted)'}}
              onClick={() => setLang('hi')}
            >
              हिन्दी
            </button>
          </div>
        </div>
      </div>

      <div style={{marginBottom:24}}>
        <span className="badge badge-primary" style={{marginBottom:6}}>Test Summary</span>
        <h1 className="page-title" style={{marginBottom:4}}>{test.title || 'Mock Test Result'}</h1>
        {test.course_title && <div className="text-muted text-sm">{test.course_title}</div>}
      </div>

      <div className="result-summary">
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-val" style={{color:s.color}}>{s.val}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {rawQuestions.length > 0 && (
        <>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <div className="section-title" style={{marginBottom:0}}>Detailed Question &amp; Solution Review</div>
            {lang === 'hi' && translating && (
              <span className="badge badge-warning" style={{fontSize:12}}>
                🔄 अनुवाद हो रहा है...
              </span>
            )}
          </div>

          <div className="review-list">
            {rawQuestions.map((rawQ, i) => {
              const q = (lang === 'hi' && translatedMap[rawQ.id]) ? translatedMap[rawQ.id] : rawQ

              const selectedOpt = rawQ.selected_option || rawQ.selectedOption
              const correctOpt = rawQ.correct_option || rawQ.correctOption

              const isSkipped = !selectedOpt
              const isCorrect = Boolean(rawQ.is_correct === 1 || rawQ.isCorrect || (selectedOpt && selectedOpt === correctOpt))
              const isWrong = !isSkipped && !isCorrect

              const status = isCorrect ? 'correct' : isWrong ? 'wrong' : 'skipped'

              const options = [
                { key: 'A', text: q.option_a },
                { key: 'B', text: q.option_b },
                { key: 'C', text: q.option_c },
                { key: 'D', text: q.option_d },
              ].filter(opt => opt.text !== undefined && opt.text !== null && opt.text !== '')

              return (
                <div key={rawQ.id || i} className={`review-item ${status}`}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                    <span className="text-sm text-muted fw-bold">Q{i+1} {q.subject ? `• ${q.subject}` : ''}</span>
                    <span className={`badge badge-${status === 'correct' ? 'success' : status === 'wrong' ? 'danger' : 'warning'}`}>
                      {status === 'correct' ? '✓ Correct' : status === 'wrong' ? '✗ Incorrect' : '— Skipped'}
                    </span>
                  </div>

                  <div style={{fontWeight:600,marginBottom:14,lineHeight:1.6,fontSize:15,whiteSpace:'pre-wrap'}}>
                    {q.question_text || q.text || q.question}
                  </div>

                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {options.map((opt) => {
                      const isThisCorrect = opt.key === correctOpt
                      const isThisSelected = opt.key === selectedOpt

                      let bg = 'transparent'
                      let color = 'var(--text)'
                      let border = '1px solid var(--border)'
                      let fw = '500'

                      if (isThisCorrect) {
                        bg = 'var(--success-soft)'
                        color = 'var(--success)'
                        border = '1.5px solid var(--success)'
                        fw = '700'
                      } else if (isThisSelected && !isCorrect) {
                        bg = 'var(--danger-soft)'
                        color = 'var(--danger)'
                        border = '1.5px solid var(--danger)'
                        fw = '700'
                      }

                      return (
                        <div
                          key={opt.key}
                          style={{
                            padding: '9px 14px',
                            borderRadius: 8,
                            background: bg,
                            color,
                            border,
                            fontWeight: fw,
                            fontSize: 14,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <span style={{marginRight:8,fontWeight:800}}>({opt.key})</span>
                            {opt.text}
                          </div>
                          {isThisCorrect && <span style={{fontWeight:800,fontSize:13}}>✓ Correct Answer</span>}
                          {isThisSelected && !isThisCorrect && <span style={{fontWeight:800,fontSize:13}}>✗ Your Choice</span>}
                        </div>
                      )
                    })}
                  </div>

                  {q.explanation && (
                    <div style={{marginTop:12,padding:'10px 14px',background:'var(--primary-soft)',borderRadius:8,fontSize:13.5,color:'var(--primary-dark)',lineHeight:1.5}}>
                      💡 <strong>Explanation:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
