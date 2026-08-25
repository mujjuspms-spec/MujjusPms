import { apiFetch, uploadFile } from './api';

export function fetchAllTasks() {
  return apiFetch('/api/tasks').then((r) => r.tasks);
}

export function fetchProjectTasks(projectId) {
  return apiFetch(`/api/tasks/project/${projectId}`);
}

export function createTask(payload) {
  return apiFetch('/api/tasks', { method: 'POST', body: JSON.stringify(payload) }).then((r) => r.task);
}

export function updateTask(id, patch) {
  return apiFetch(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }).then((r) => r.task);
}

export function deleteTask(id) {
  return apiFetch(`/api/tasks/${id}`, { method: 'DELETE' });
}

export function moveTask(id, direction) {
  return apiFetch(`/api/tasks/${id}/move`, { method: 'POST', body: JSON.stringify({ direction }) });
}

export function fetchTaskCollaborators(taskId) {
  return apiFetch(`/api/tasks/${taskId}/collaborators`).then((r) => r.collaborators);
}

export function addTaskCollaborator(taskId, personId) {
  return apiFetch(`/api/tasks/${taskId}/collaborators`, {
    method: 'POST', body: JSON.stringify({ personId }),
  }).then((r) => r.collaborators);
}

export function removeTaskCollaborator(taskId, userId) {
  return apiFetch(`/api/tasks/${taskId}/collaborators/${userId}`, { method: 'DELETE' }).then((r) => r.collaborators);
}

export function fetchAttachments(taskId) {
  return apiFetch(`/api/attachments/task/${taskId}`).then((r) => r.attachments);
}

export function uploadAttachment(taskId, file) {
  return uploadFile(`/api/attachments/tasks/${taskId}/attachments`, file).then((r) => r.attachment);
}

export function deleteAttachment(id) {
  return apiFetch(`/api/attachments/${id}`, { method: 'DELETE' });
}
