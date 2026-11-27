import { useState, useEffect } from 'react'
import { api } from '../api'

export default function DashboardPage({ onReview }) {
  const [data, setData]   = useState(null)
  const [loading, setL]   = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.dashboard()
      .then(r => setData(r))
      .catch(e => setError(e.message))
      .finally(() => setL(false))
  }, [])

  if (loading) return <div style={{display:'flex',justifyContent:'center',padding:60}}><div className="spinner" /></div>
  if (error)   return <div className="error-box">{error}</div>

  const summary = data?.summary || data?.stats || {}
  const attempts = data?.attempts || data?.recentAttempts || []

  const totalQuestionsAnsweredOrSeen =
    summary.totalQuestions ??
    (attempts.length > 0
      ? attempts.reduce((sum, a) => sum + (a.total_questions ?? a.totalQuestions ?? 0), 0)
      : (summary.totalAttempted != null ? summary.totalAttempted + (summary.totalUnattempted || 0) : null))

  const avgScoreVal = summary.averageScorePercent ?? summary.avgScore
  const bestScoreVal = summary.bestScorePercent ?? summary.bestScore
  const testsTakenVal = summary.totalTestsTaken ?? summary.totalAttempts ?? attempts.length

  const cards = [
    { label:'Tests Taken',    val: testsTakenVal, color:'var(--primary)' },
    { label:'Avg Score',      val: avgScoreVal != null ? `${avgScoreVal}%` : '—', color:'var(--success)' },
    { label:'Best Score',     val: bestScoreVal != null ? `${bestScoreVal}%` : '—', color:'var(--warning)' },
    { label:'Total Questions',val: totalQuestionsAnsweredOrSeen ?? '—', color:'var(--muted)' },
  ]

  return (
    <div>
      <h1 className="page-title">📊 My Dashboard</h1>

      <div className="stats-row">
        {cards.map(c => (
          <div key={c.label} className="stat-card">
            <div className="stat-val" style={{color:c.color}}>{c.val}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="section-title">Recent Attempts</div>
      {attempts.length === 0 ? (
        <div className="card"><p className="text-muted">No attempts yet. Take a test to see your progress here!</p></div>
      ) : (
        <div className="card table-responsive" style={{padding:0}}>
          <table className="attempts-table">
            <thead>
              <tr>
                <th>Test</th>
                <th>Score</th>
                <th>Accuracy</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((a, i) => {
                const title = a.test_title || a.testTitle || a.title || `Test #${i+1}`
                const maxScore = a.max_score ?? a.total ?? a.maxMarks ?? 100
                const dateVal = a.submitted_at || a.submittedAt || a.started_at
                return (
                  <tr key={a.id || i}>
                    <td><div style={{fontWeight:600}}>{title}</div></td>
                    <td><span className="badge badge-primary">{a.score ?? a.marks ?? '—'}/{maxScore}</span></td>
                    <td>{a.accuracy != null ? `${a.accuracy}%` : '—'}</td>
                    <td className="text-muted text-sm">{dateVal ? new Date(dateVal).toLocaleDateString() : '—'}</td>
                    <td><button className="btn btn-outline btn-sm" onClick={() => onReview(a.id || a.attemptId)}>Review</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
