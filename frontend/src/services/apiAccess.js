import { apiFetch } from './api';

export function fetchApiKeys() {
  return apiFetch('/api/keys').then((r) => r.keys);
}
export function createApiKey(name) {
  return apiFetch('/api/keys', { method: 'POST', body: JSON.stringify({ name }) });
}
export function revokeApiKey(id) {
  return apiFetch(`/api/keys/${id}`, { method: 'DELETE' });
}

export function fetchWebhooks() {
  return apiFetch('/api/webhooks').then((r) => r.webhooks);
}
export function createWebhook(url, events) {
  return apiFetch('/api/webhooks', { method: 'POST', body: JSON.stringify({ url, events }) });
}
export function updateWebhook(id, patch) {
  return apiFetch(`/api/webhooks/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }).then((r) => r.webhook);
}
export function deleteWebhook(id) {
  return apiFetch(`/api/webhooks/${id}`, { method: 'DELETE' });
}
