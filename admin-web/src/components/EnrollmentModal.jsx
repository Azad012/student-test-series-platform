import React, { useEffect, useState } from 'react';
import { X, UserPlus, Trash2 } from 'lucide-react';
import { api } from '../api';

export default function EnrollmentModal({ course, students, onClose, onUpdated }) {
  const [enrollments, setEnrollments] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await api.enrollments(course.id);
      setEnrollments(res.enrollments || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [course.id]);

  async function handleAssign(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = selectedStudentId
        ? { studentId: Number(selectedStudentId) }
        : { email: emailInput.trim() };
      await api.assignStudent(course.id, payload);
      setSelectedStudentId('');
      setEmailInput('');
      await load();
      onUpdated();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemove(studentId) {
    setError('');
    try {
      await api.removeStudent(course.id, studentId);
      await load();
      onUpdated();
    } catch (err) {
      setError(err.message);
    }
  }

  const enrolledIds = new Set(enrollments.map((e) => e.student_id));
  const availableStudents = students.filter((s) => !enrolledIds.has(s.id));

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="page-header" style={{ marginBottom: 14 }}>
          <div>
            <h3 style={{ margin: 0 }}>Manage Course Enrollments</h3>
            <p className="page-subtitle">{course.title}</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleAssign} className="card" style={{ marginBottom: 16, background: '#f8fafc' }}>
          <div className="row-2">
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Pick Registered Student</label>
              <select
                className="select"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
              >
                <option value="">-- Select a student --</option>
                {availableStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Or Enter Student Email</label>
              <input
                className="input"
                type="email"
                placeholder="student@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
              />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={!selectedStudentId && !emailInput.trim()}
            >
              <UserPlus size={14} /> Assign Student to Course
            </button>
          </div>
        </form>

        {loading ? (
          <p className="page-subtitle">Loading enrolled students...</p>
        ) : enrollments.length === 0 ? (
          <p className="page-subtitle">No students enrolled yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Email</th>
                  <th>Enrolled</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((item) => (
                  <tr key={item.student_id}>
                    <td><strong>{item.name}</strong></td>
                    <td>{item.email}</td>
                    <td>{new Date(item.enrolled_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleRemove(item.student_id)}
                      >
                        <Trash2 size={13} /> Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
