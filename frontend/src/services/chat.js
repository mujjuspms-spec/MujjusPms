import { apiFetch } from './api';

export function fetchChatMessages(projectId) {
  return apiFetch(`/api/chat?projectId=${projectId}`).then((r) => r.messages);
}
export function sendChatMessage(projectId, body) {
  return apiFetch('/api/chat', { method: 'POST', body: JSON.stringify({ projectId, body }) }).then((r) => r.message);
}
