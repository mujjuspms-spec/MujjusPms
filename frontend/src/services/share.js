import { apiFetch } from './api';

export function enableShare(projectId, expiresInDays = null) {
  return apiFetch(`/api/share/${projectId}/enable`, { method: 'POST', body: JSON.stringify({ expiresInDays }) });
}
export function disableShare(projectId) {
  return apiFetch(`/api/share/${projectId}/disable`, { method: 'POST' });
}
// No apiFetch here — the public page has no auth token, and this route is
// deliberately outside requireAuth on the backend.
export function fetchPublicProject(token) {
  return fetch(`/api/share/${token}`).then(async (res) => {
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || 'This link is invalid or has been revoked');
    return data;
  });
}
