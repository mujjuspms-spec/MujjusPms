import { apiFetch } from './api';

export function fetchMyApprovals() {
  return apiFetch('/api/approvals?mine=1').then((r) => r.approvals);
}
export function fetchTaskApprovals(taskId) {
  return apiFetch(`/api/approvals?taskId=${taskId}`).then((r) => r.approvals);
}
export function requestApproval(taskId, approverIds, note) {
  return apiFetch('/api/approvals', { method: 'POST', body: JSON.stringify({ taskId, approverIds, note }) }).then((r) => r.approvals);
}
export function decideApproval(id, status, note) {
  return apiFetch(`/api/approvals/${id}`, { method: 'PATCH', body: JSON.stringify({ status, note }) }).then((r) => r.approval);
}
