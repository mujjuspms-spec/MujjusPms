import { apiFetch } from './api';

export function fetchIssues(projectId) {
  const qs = projectId ? `?projectId=${projectId}` : '';
  return apiFetch(`/api/issues${qs}`).then((r) => r.issues);
}
export function createIssue(payload) {
  return apiFetch('/api/issues', { method: 'POST', body: JSON.stringify(payload) }).then((r) => r.issue);
}
export function updateIssue(id, patch) {
  return apiFetch(`/api/issues/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }).then((r) => r.issue);
}
export function deleteIssue(id) {
  return apiFetch(`/api/issues/${id}`, { method: 'DELETE' });
}
