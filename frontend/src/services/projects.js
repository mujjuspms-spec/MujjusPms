import { apiFetch } from './api';

export const PROJECTS = [];

export function project(id) {
  return PROJECTS.find((p) => p.id === id);
}

export async function fetchProjects() {
  const { projects } = await apiFetch('/api/projects');
  PROJECTS.length = 0;
  PROJECTS.push(...projects);
  return PROJECTS;
}

export async function createProject(payload) {
  const { project, tasksCreated } = await apiFetch('/api/projects', { method: 'POST', body: JSON.stringify(payload) });
  PROJECTS.push(project);
  return { project, tasksCreated };
}

export function fetchProjectMembers(projectId) {
  return apiFetch(`/api/projects/${projectId}/members`).then((r) => r.members);
}

// Project membership is now assignment-only — write-vs-read-only comes
// from the person's workspace role, not a separate per-project role.
export function addProjectMember(projectId, personId) {
  return apiFetch(`/api/projects/${projectId}/members`, {
    method: 'POST', body: JSON.stringify({ personId }),
  }).then((r) => r.members);
}

export function removeProjectMember(projectId, userId) {
  return apiFetch(`/api/projects/${projectId}/members/${userId}`, { method: 'DELETE' }).then((r) => r.members);
}

async function setArchived(projectId, archived) {
  const { project: updated } = await apiFetch(`/api/projects/${projectId}/${archived ? 'archive' : 'unarchive'}`, { method: 'POST' });
  const i = PROJECTS.findIndex((p) => p.id === projectId);
  if (i !== -1) PROJECTS[i] = updated;
  return updated;
}
export const archiveProject = (projectId) => setArchived(projectId, true);
export const unarchiveProject = (projectId) => setArchived(projectId, false);

export async function updateProject(projectId, patch) {
  const { project: updated } = await apiFetch(`/api/projects/${projectId}`, {
    method: 'PATCH', body: JSON.stringify(patch),
  });
  const i = PROJECTS.findIndex((p) => p.id === projectId);
  if (i !== -1) PROJECTS[i] = updated;
  return updated;
}

export async function deleteProject(projectId) {
  await apiFetch(`/api/projects/${projectId}`, { method: 'DELETE' });
  const i = PROJECTS.findIndex((p) => p.id === projectId);
  if (i !== -1) PROJECTS.splice(i, 1);
}
