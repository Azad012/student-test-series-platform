import { useState, useEffect } from 'react'
import { api } from '../api'

export default function ResultPage({ attemptId, onBack }) {
  const [data, setData]     = useState(null)
  const [loading, setLoad]  = useState(true)
  const [error, setError]   = useState('')

  useEffect(() => {
    api.attemptResult(attemptId)
      .then(r => setData(r))
      .catch(e => setError(e.message))
      .finally(() => setLoad(false))
  }, [attemptId])

  if (loading) return <div style={{display:'flex',justifyContent:'center',padding:80}}><div className="spinner" /></div>
  if (error)   return <div style={{padding:24}}><div className="error-box">{error}</div><button className="btn btn-outline" onClick={onBack}>← Back</button></div>

  const r = data?.result || data
  const stats = [
    { label:'Score',      val: `${r?.score ?? r?.marks ?? 0}/${r?.total ?? r?.maxMarks ?? 100}`, color:'var(--primary)' },
    { label:'Correct',    val: r?.correct ?? 0,   color:'var(--success)' },
    { label:'Wrong',      val: r?.wrong ?? 0,      color:'var(--danger)'  },
    { label:'Skipped',    val: r?.skipped ?? 0,    color:'var(--warning)' },
    { label:'Accuracy',   val: `${r?.accuracy ?? 0}%`, color:'var(--primary)' },
    { label:'Time Taken', val: r?.timeTaken ?? '—', color:'var(--muted)'  },
  ]

  const questions = data?.questions || []

  return (
    <div style={{maxWidth:860,margin:'0 auto',padding:24}}>
      <button className="btn btn-outline btn-sm" style={{marginBottom:20}} onClick={onBack}>← Back</button>
      <h1 className="page-title">📊 Result Review</h1>

      <div className="result-summary">
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-val" style={{color:s.color}}>{s.val}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {questions.length > 0 && (
        <>
          <div className="section-title">Question-wise Review</div>
          <div className="review-list">
            {questions.map((q, i) => {
              const status = q.isCorrect ? 'correct' : q.selectedOption == null ? 'skipped' : 'wrong'
              return (
                <div key={i} className={`review-item ${status}`}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                    <span className="text-sm text-muted">Q{i+1}</span>
                    <span className={`badge badge-${status === 'correct' ? 'success' : status === 'wrong' ? 'danger' : 'warning'}`}>
                      {status === 'correct' ? '✓ Correct' : status === 'wrong' ? '✗ Wrong' : '— Skipped'}
                    </span>
                  </div>
                  <div style={{fontWeight:600,marginBottom:12,lineHeight:1.5}}>{q.text || q.question}</div>
                  {(q.options || []).map((opt, oi) => {
                    let bg = 'transparent', color = 'var(--text)', fw = 'normal'
                    if (oi === q.correctOption) { bg='var(--success-soft)'; color='var(--success)'; fw='700' }
                    else if (oi === q.selectedOption && !q.isCorrect) { bg='var(--danger-soft)'; color='var(--danger)'; fw='600' }
                    return (
                      <div key={oi} style={{padding:'7px 12px',borderRadius:7,background:bg,color,fontWeight:fw,fontSize:14,marginBottom:5}}>
                        {String.fromCharCode(65+oi)}. {opt}
                        {oi === q.correctOption && ' ✓'}
                        {oi === q.selectedOption && !q.isCorrect && ' ✗'}
                      </div>
                    )
                  })}
                  {q.explanation && (
                    <div style={{marginTop:10,padding:'8px 12px',background:'var(--primary-soft)',borderRadius:7,fontSize:13,color:'var(--primary-dark)'}}>
                      💡 {q.explanation}
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
