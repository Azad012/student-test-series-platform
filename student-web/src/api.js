const API_URL = import.meta.env.VITE_API_URL || 'https://exampulse-y2py.onrender.com';

let token = localStorage.getItem('student_token') || '';

export function setToken(t) {
  token = t || '';
  if (token) localStorage.setItem('student_token', token);
  else localStorage.removeItem('student_token');
}

export function getToken() { return token; }

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  // Auth
  login:    (email, password) => request('/api/auth/login',    { method:'POST', body: JSON.stringify({ email, password }) }),
  register: (payload)         => request('/api/auth/register', { method:'POST', body: JSON.stringify(payload) }),
  me:       ()                => request('/api/auth/me'),

  // Courses
  courses:      ()         => request('/api/courses'),
  enrollCourse: (id)       => request(`/api/courses/${id}/enroll`, { method:'POST', body:'{}' }),
  courseTests:  (courseId) => request(`/api/tests/course/${courseId}`),

  // Attempts
  startAttempt:  (testId)            => request(`/api/attempts/tests/${testId}/start`, { method:'POST', body:'{}' }),
  saveAnswer:    (attemptId, payload) => request(`/api/attempts/${attemptId}/answer`,  { method:'PUT',  body: JSON.stringify(payload) }),
  submitAttempt: (attemptId)          => request(`/api/attempts/${attemptId}/submit`,  { method:'POST', body:'{}' }),
  attemptResult: (attemptId)          => request(`/api/attempts/${attemptId}/result`),

  // Dashboard
  dashboard: () => request('/api/student/dashboard'),
};
