import { apiFetch } from './api';

export function fetchSprints(projectId) {
  return apiFetch(`/api/sprints?projectId=${projectId}`).then((r) => r.sprints);
}
export function createSprint(payload) {
  return apiFetch('/api/sprints', { method: 'POST', body: JSON.stringify(payload) }).then((r) => r.sprint);
}
export function updateSprint(id, patch) {
  return apiFetch(`/api/sprints/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }).then((r) => r.sprint);
}
export function deleteSprint(id) {
  return apiFetch(`/api/sprints/${id}`, { method: 'DELETE' });
}
export function fetchSprintVelocity(projectId) {
  return apiFetch(`/api/sprints/velocity?projectId=${projectId}`).then((r) => r.sprints);
}
export function fetchSprintBurndown(id) {
  return apiFetch(`/api/sprints/${id}/burndown`);
}
