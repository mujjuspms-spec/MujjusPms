import { apiFetch } from './api';

export function fetchGoals() {
  return apiFetch('/api/goals').then((r) => r.goals);
}
export function createGoal(payload) {
  return apiFetch('/api/goals', { method: 'POST', body: JSON.stringify(payload) }).then((r) => r.goal);
}
export function updateGoal(id, patch) {
  return apiFetch(`/api/goals/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }).then((r) => r.goal);
}
export function deleteGoal(id) {
  return apiFetch(`/api/goals/${id}`, { method: 'DELETE' });
}
