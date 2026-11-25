import React, { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Trash2, Upload, BarChart2 } from 'lucide-react';
import { api } from '../api';
import BulkImportModal from './BulkImportModal';
import AttemptReviewModal from './AttemptReviewModal';

const emptyQuestion = {
  subject: 'General',
  question_text: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_option: 'A',
  explanation: '',
};

export default function TestQuestionsView({ test, course, onBack }) {
  const [questions, setQuestions] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [tab, setTab] = useState('questions');
  const [form, setForm] = useState(emptyQuestion);
  const [showImport, setShowImport] = useState(false);
  const [reviewAttemptId, setReviewAttemptId] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setError('');
    try {
      const [qRes, aRes] = await Promise.all([api.questions(test.id), api.testAttempts(test.id)]);
      setQuestions(qRes.questions || []);
      setAttempts(aRes.attempts || []);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, [test.id]);

  async function handleAddQuestion(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.addQuestion(test.id, form);
      setForm(emptyQuestion);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteQuestion(id) {
    try {
      await api.deleteQuestion(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-secondary btn-sm" onClick={onBack} style={{ marginBottom: 8 }}>
            <ArrowLeft size={14} /> Back to {course.title}
          </button>
          <h1 className="page-title">{test.title}</h1>
          <p className="page-subtitle">
            {test.duration_minutes} mins · +{test.marks_correct} / -{test.negative_marks} marking ·{' '}
            {questions.length} questions
          </p>
        </div>
        <div className="flex-gap">
          <button
            className={`btn btn-sm ${tab === 'questions' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab('questions')}
          >
            Questions ({questions.length})
          </button>
          <button
            className={`btn btn-sm ${tab === 'results' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab('results')}
          >
            <BarChart2 size={14} /> Student Results ({attempts.length})
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowImport(true)}>
            <Upload size={14} /> Bulk CSV / JSON Import
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {tab === 'questions' ? (
        <>
          <form onSubmit={handleAddQuestion} className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginTop: 0, marginBottom: 14 }}>Add Single Question</h3>
            <div className="row-2">
              <div className="field">
                <label>Subject / Topic</label>
                <input
                  className="input"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label>Correct Option</label>
                <select
                  className="select"
                  value={form.correct_option}
                  onChange={(e) => setForm({ ...form, correct_option: e.target.value })}
                >
                  <option value="A">Option A</option>
                  <option value="B">Option B</option>
                  <option value="C">Option C</option>
                  <option value="D">Option D</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label>Question Text</label>
              <textarea
                className="textarea"
                style={{ minHeight: 70 }}
                value={form.question_text}
                onChange={(e) => setForm({ ...form, question_text: e.target.value })}
                required
              />
            </div>
            <div className="row-2">
              <div className="field">
                <label>Option A</label>
                <input
                  className="input"
                  value={form.option_a}
                  onChange={(e) => setForm({ ...form, option_a: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label>Option B</label>
                <input
                  className="input"
                  value={form.option_b}
                  onChange={(e) => setForm({ ...form, option_b: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label>Option C</label>
                <input
                  className="input"
                  value={form.option_c}
                  onChange={(e) => setForm({ ...form, option_c: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label>Option D</label>
                <input
                  className="input"
                  value={form.option_d}
                  onChange={(e) => setForm({ ...form, option_d: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="field">
              <label>Solution Explanation (shown to student after submitting)</label>
              <input
                className="input"
                value={form.explanation}
                onChange={(e) => setForm({ ...form, explanation: e.target.value })}
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              <Plus size={15} /> {saving ? 'Adding...' : 'Add Question'}
            </button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {questions.map((q, idx) => (
              <div key={q.id} className="card">
                <div className="flex-gap" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                  <div className="flex-gap">
                    <span className="badge badge-indigo">Q{idx + 1}</span>
                    <span className="badge badge-amber">{q.subject}</span>
                    <span className="badge badge-green">Ans: {q.correct_option}</span>
                  </div>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDeleteQuestion(q.id)}
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>{q.question_text}</div>
                <div className="row-2" style={{ fontSize: 13.5, color: '#334155' }}>
                  <div>A) {q.option_a}</div>
                  <div>B) {q.option_b}</div>
                  <div>C) {q.option_c}</div>
                  <div>D) {q.option_d}</div>
                </div>
                {q.explanation && (
                  <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--muted)' }}>
                    <strong>Explanation:</strong> {q.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="card table-wrap">
          {attempts.length === 0 ? (
            <p className="page-subtitle">No student submissions for this test yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Score</th>
                  <th>Accuracy</th>
                  <th>Correct / Wrong</th>
                  <th>Submitted</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.student_name}</strong>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{a.student_email}</div>
                    </td>
                    <td>
                      <strong>{a.score}</strong> / {a.max_score}
                    </td>
                    <td>{a.accuracy}%</td>
                    <td>
                      {a.correct_count} / {a.wrong_count}
                    </td>
                    <td>{new Date(a.submitted_at).toLocaleString()}</td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setReviewAttemptId(a.id)}
                      >
                        Inspect Q&A
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showImport && (
        <BulkImportModal
          test={test}
          onClose={() => setShowImport(false)}
          onImported={load}
        />
      )}

      {reviewAttemptId && (
        <AttemptReviewModal
          attemptId={reviewAttemptId}
          onClose={() => setReviewAttemptId(null)}
        />
      )}
    </div>
  );
}
