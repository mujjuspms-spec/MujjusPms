import { apiFetch } from './api';

export function fetchComments(taskId) {
  return apiFetch(`/api/comments/task/${taskId}`).then((r) => r.comments);
}

export function createComment(taskId, body) {
  return apiFetch(`/api/comments/tasks/${taskId}/comments`, {
    method: 'POST', body: JSON.stringify({ body }),
  }).then((r) => r.comment);
}

export function updateComment(id, body) {
  return apiFetch(`/api/comments/${id}`, { method: 'PATCH', body: JSON.stringify({ body }) }).then((r) => r.comment);
}

export function deleteComment(id) {
  return apiFetch(`/api/comments/${id}`, { method: 'DELETE' });
}
