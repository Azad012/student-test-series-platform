import { Platform } from 'react-native';
import { getItem, setItem, removeItem } from './storage';

const TOKEN_KEY = 'student_auth_token';
const API_URL_KEY = 'student_api_base_url';

export function getDefaultApiUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:4000';
  }
  return 'http://localhost:4000';
}

let cachedApiUrl = getDefaultApiUrl();
let cachedToken = '';

export async function hydrateClientConfig() {
  const [savedUrl, savedToken] = await Promise.all([
    getItem(API_URL_KEY),
    getItem(TOKEN_KEY),
  ]);
  if (savedUrl) cachedApiUrl = savedUrl;
  if (savedToken) cachedToken = savedToken;
  return { apiUrl: cachedApiUrl, token: cachedToken };
}

export function getApiUrl() {
  return cachedApiUrl;
}

export async function setApiUrl(url) {
  const cleaned = String(url || '').trim().replace(/\/+$/, '');
  cachedApiUrl = cleaned || getDefaultApiUrl();
  await setItem(API_URL_KEY, cachedApiUrl);
  return cachedApiUrl;
}

export async function setAuthToken(token) {
  cachedToken = token || '';
  if (cachedToken) await setItem(TOKEN_KEY, cachedToken);
  else await removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (cachedToken) {
    headers.Authorization = `Bearer ${cachedToken}`;
  }

  const res = await fetch(`${cachedApiUrl}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const mobileApi = {
  register: (payload) =>
    request('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (email, password) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request('/api/auth/me'),

  courses: () => request('/api/courses'),
  enrollCourse: (courseId) =>
    request(`/api/courses/${courseId}/enroll`, { method: 'POST', body: JSON.stringify({}) }),
  courseTests: (courseId) => request(`/api/tests/course/${courseId}`),

  startAttempt: (testId) =>
    request(`/api/attempts/tests/${testId}/start`, { method: 'POST', body: JSON.stringify({}) }),
  saveAnswer: (attemptId, payload) =>
    request(`/api/attempts/${attemptId}/answer`, { method: 'PUT', body: JSON.stringify(payload) }),
  submitAttempt: (attemptId, payload = {}) =>
    request(`/api/attempts/${attemptId}/submit`, { method: 'POST', body: JSON.stringify(payload) }),
  attemptResult: (attemptId) => request(`/api/attempts/${attemptId}/result`),

  dashboard: () => request('/api/student/dashboard'),
};
