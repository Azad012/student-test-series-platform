const BASE_URL = import.meta.env.VITE_API_URL || '';

function getToken() {
  return localStorage.getItem('admin_token') || '';
}

export function setToken(token) {
  if (token) localStorage.setItem('admin_token', token);
  else localStorage.removeItem('admin_token');
}

async function apiFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  login: (email, password) =>
    apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => apiFetch('/api/auth/me'),
  overview: () => apiFetch('/api/admin/overview'),
  students: () => apiFetch('/api/admin/students'),

  courses: () => apiFetch('/api/courses'),
  createCourse: (payload) =>
    apiFetch('/api/courses', { method: 'POST', body: JSON.stringify(payload) }),
  updateCourse: (id, payload) =>
    apiFetch(`/api/courses/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteCourse: (id) => apiFetch(`/api/courses/${id}`, { method: 'DELETE' }),

  enrollments: (courseId) => apiFetch(`/api/courses/${courseId}/enrollments`),
  assignStudent: (courseId, payload) =>
    apiFetch(`/api/courses/${courseId}/enrollments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  removeStudent: (courseId, studentId) =>
    apiFetch(`/api/courses/${courseId}/enrollments/${studentId}`, { method: 'DELETE' }),

  courseTests: (courseId) => apiFetch(`/api/tests/course/${courseId}`),
  createTest: (courseId, payload) =>
    apiFetch(`/api/tests/course/${courseId}`, { method: 'POST', body: JSON.stringify(payload) }),
  updateTest: (testId, payload) =>
    apiFetch(`/api/tests/${testId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteTest: (testId) => apiFetch(`/api/tests/${testId}`, { method: 'DELETE' }),

  questions: (testId) => apiFetch(`/api/tests/${testId}/questions`),
  addQuestion: (testId, payload) =>
    apiFetch(`/api/tests/${testId}/questions`, { method: 'POST', body: JSON.stringify(payload) }),
  updateQuestion: (questionId, payload) =>
    apiFetch(`/api/tests/questions/${questionId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteQuestion: (questionId) =>
    apiFetch(`/api/tests/questions/${questionId}`, { method: 'DELETE' }),
  importQuestions: (testId, format, data) =>
    apiFetch(`/api/tests/${testId}/questions/import`, {
      method: 'POST',
      body: JSON.stringify({ format, data }),
    }),

  testAttempts: (testId) => apiFetch(`/api/admin/tests/${testId}/attempts`),
  attemptResult: (attemptId) => apiFetch(`/api/attempts/${attemptId}/result`),
};
