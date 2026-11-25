export const COLORS = {
  bg: '#F4F6FB',
  surface: '#FFFFFF',
  surfaceAlt: '#F8FAFC',
  text: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
  primary: '#4F46E5',
  primarySoft: '#EEF2FF',
  primaryDark: '#3730A3',
  success: '#059669',
  successSoft: '#ECFDF5',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  warning: '#D97706',
  warningSoft: '#FFFBEB',
  purple: '#7C3AED',
  purpleSoft: '#F3E8FF',
  navy: '#0F172A',
};

export function formatDurationClock(totalSeconds) {
  const sec = Math.max(0, Math.floor(totalSeconds || 0));
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const rem = sec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  if (hrs > 0) return `${pad(hrs)}:${pad(mins)}:${pad(rem)}`;
  return `${pad(mins)}:${pad(rem)}`;
}
