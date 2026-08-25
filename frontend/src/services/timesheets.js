import { apiFetch, getToken } from './api';

export function fetchProjectTimesheets(projectId) {
  return apiFetch(`/api/timesheets/project/${projectId}`).then((r) => r.entries);
}

export function fetchUserTimesheets(userId) {
  return apiFetch(`/api/timesheets/user/${userId}`).then((r) => r.entries);
}

export function fetchTimesheetSummary() {
  return apiFetch('/api/timesheets/summary').then((r) => r.totals);
}

export function logTime(payload) {
  return apiFetch('/api/timesheets', { method: 'POST', body: JSON.stringify(payload) }).then((r) => r.entry);
}

export function deleteTimeEntry(id) {
  return apiFetch(`/api/timesheets/${id}`, { method: 'DELETE' });
}

export function timesheetExportUrl(projectId) {
  const token = getToken();
  const qs = new URLSearchParams({ token: token || '' });
  if (projectId) qs.set('projectId', projectId);
  return `/api/timesheets/export?${qs.toString()}`;
}
