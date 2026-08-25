import { apiFetch } from './api';

export function fetchActiveTimer() {
  return apiFetch('/api/timer').then((r) => r.timer);
}
export function startTimer(projectId, taskId) {
  return apiFetch('/api/timer/start', { method: 'POST', body: JSON.stringify({ projectId, taskId }) }).then((r) => r.timer);
}
export function stopTimer() {
  return apiFetch('/api/timer/stop', { method: 'POST' }).then((r) => r.entry);
}
