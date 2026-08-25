import { apiFetch } from './api';

export function fetchAutomationRules() {
  return apiFetch('/api/automations').then((r) => r.rules);
}
export function createAutomationRule(rule) {
  return apiFetch('/api/automations', { method: 'POST', body: JSON.stringify(rule) }).then((r) => r.rule);
}
export function updateAutomationRule(id, patch) {
  return apiFetch(`/api/automations/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }).then((r) => r.rule);
}
export function deleteAutomationRule(id) {
  return apiFetch(`/api/automations/${id}`, { method: 'DELETE' });
}
