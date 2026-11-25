import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../api';

export default function AttemptReviewModal({ attemptId, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .attemptResult(attemptId)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [attemptId]);

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: 820 }}>
        <div className="page-header" style={{ marginBottom: 14 }}>
          <div>
            <h3 style={{ margin: 0 }}>Attempt Score & Q&A Breakdown</h3>
            {data && (
              <p className="page-subtitle">
                {data.student?.name} · {data.test?.title}
              </p>
            )}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {!data && !error && <p className="page-subtitle">Loading result...</p>}
        {data && (
          <>
            <div className="grid-kpi" style={{ marginBottom: 16 }}>
              <div className="card">
                <div className="kpi-label">Score</div>
                <div className="kpi-value">
                  {data.attempt.score} / {data.attempt.max_score}
                </div>
              </div>
              <div className="card">
                <div className="kpi-label">Accuracy</div>
                <div className="kpi-value">{data.attempt.accuracy}%</div>
              </div>
              <div className="card">
                <div className="kpi-label">Correct / Wrong</div>
                <div className="kpi-value">
                  <span style={{ color: 'var(--success)' }}>{data.attempt.correct_count}</span>
                  {' / '}
                  <span style={{ color: 'var(--danger)' }}>{data.attempt.wrong_count}</span>
                </div>
              </div>
              <div className="card">
                <div className="kpi-label">Unattempted</div>
                <div className="kpi-value">{data.attempt.unattempted_count}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.questions.map((q, idx) => (
                <div key={q.id} className="card" style={{ padding: 14 }}>
                  <div className="flex-gap" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                    <span className="badge badge-indigo">{q.subject}</span>
                    <span
                      className={`badge ${
                        !q.selected_option
                          ? 'badge-amber'
                          : q.is_correct
                          ? 'badge-green'
                          : 'badge-red'
                      }`}
                    >
                      {!q.selected_option
                        ? 'Unattempted (0)'
                        : q.is_correct
                        ? `Correct (${q.marks_awarded > 0 ? `+${q.marks_awarded}` : q.marks_awarded})`
                        : `Wrong (${q.marks_awarded})`}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>
                    {idx + 1}. {q.question_text}
                  </div>
                  <div style={{ fontSize: 13, color: '#334155' }}>
                    Selected: <strong>{q.selected_option || 'None'}</strong> · Correct:{' '}
                    <strong style={{ color: 'var(--success)' }}>{q.correct_option}</strong>
                  </div>
                  {q.explanation && (
                    <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>
                      Explanation: {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
