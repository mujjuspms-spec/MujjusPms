import { apiFetch } from './api';

export function fetchIntegrations() {
  return apiFetch('/api/integrations').then((r) => r.integrations);
}
export function updateIntegration(provider, patch) {
  return apiFetch(`/api/integrations/${provider}`, { method: 'PATCH', body: JSON.stringify(patch) }).then((r) => r.integration);
}
export function testSlack() {
  return apiFetch('/api/integrations/slack/test', { method: 'POST' });
}
export function connectGoogleCalendar() {
  return apiFetch('/api/integrations/googleCalendar/connect', { method: 'GET' }).then((r) => r.url);
}
export function syncGoogleCalendar() {
  return apiFetch('/api/integrations/googleCalendar/sync', { method: 'POST' });
}
export function fetchSsoStatus() {
  return apiFetch('/api/auth/sso/status');
}
