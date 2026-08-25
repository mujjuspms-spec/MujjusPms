import { apiFetch, uploadFile } from './api';

function base(workspaceId) {
  return `/api/workspaces/${workspaceId}/settings`;
}

export function fetchWorkspaceSettings(workspaceId) {
  return apiFetch(base(workspaceId));
}

export function updateGeneral(workspaceId, patch) {
  return apiFetch(`${base(workspaceId)}/general`, { method: 'PATCH', body: JSON.stringify(patch) });
}

export async function uploadWorkspaceLogo(workspaceId, file) {
  return uploadFile(`${base(workspaceId)}/logo`, file);
}

export function removeWorkspaceLogo(workspaceId) {
  return apiFetch(`${base(workspaceId)}/logo`, { method: 'DELETE' });
}

function patchSection(section) {
  return (workspaceId, patch) => apiFetch(`${base(workspaceId)}/${section}`, { method: 'PATCH', body: JSON.stringify(patch) });
}

export const updateWorkSchedule = patchSection('work-schedule');
export const updateProjectDefaults = patchSection('projects');
export const updateTaskDefaults = patchSection('tasks');
export const updateTimesheetSettings = patchSection('timesheets');
export const updateNotificationDefaults = patchSection('notifications');
export const updateSecuritySettings = patchSection('security');

export function archiveWorkspace(workspaceId) {
  return apiFetch(`${base(workspaceId)}/archive`, { method: 'POST' });
}
export function unarchiveWorkspace(workspaceId) {
  return apiFetch(`${base(workspaceId)}/unarchive`, { method: 'POST' });
}
export function deleteWorkspace(workspaceId, confirmName) {
  return apiFetch(`${base(workspaceId)}`, { method: 'DELETE', body: JSON.stringify({ confirmName }) });
}

export function exportWorkspaceData(workspaceId, kind) {
  return `${base(workspaceId)}/export/${kind}`;
}
