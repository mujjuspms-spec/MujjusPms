import { apiFetch } from './api';

export function fetchAuditLog(params = {}) {
  const { limit = 200, userId, action, from, to } = params;
  const qs = new URLSearchParams({ limit: String(limit) });
  if (userId) qs.set('userId', userId);
  if (action) qs.set('action', action);
  if (from) qs.set('from', from);
  if (to) qs.set('to', to);
  return apiFetch(`/api/audit-log?${qs.toString()}`).then((r) => r.entries);
}
