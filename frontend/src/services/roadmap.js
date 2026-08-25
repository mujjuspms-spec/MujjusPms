import { apiFetch } from './api';

export function fetchRoadmapTemplates() {
  return apiFetch('/api/roadmap/templates').then((r) => r.templates);
}

// Applies a template to an existing project as real tasks + subtasks.
// `phasesOverride`, when given (from a reviewed/customized preview),
// applies those phases instead of re-fetching the template fresh by key.
export function applyRoadmapTemplate(projectId, templateKey, phasesOverride) {
  return apiFetch('/api/roadmap/apply', {
    method: 'POST', body: JSON.stringify({ projectId, templateKey, phases: phasesOverride }),
  });
}

// Saves a set of phases (name, description, category, phases[]) as a
// reusable custom template for the whole workspace.
export function saveCustomTemplate(payload) {
  return apiFetch('/api/roadmap/templates', { method: 'POST', body: JSON.stringify(payload) }).then((r) => r.template);
}

export function deleteCustomTemplate(key) {
  return apiFetch(`/api/roadmap/templates/${key}`, { method: 'DELETE' });
}
