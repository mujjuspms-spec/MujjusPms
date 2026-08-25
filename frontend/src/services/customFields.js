import { apiFetch } from './api';

export function fetchFieldDefs(projectId) {
  return apiFetch(`/api/custom-fields?projectId=${projectId}`).then((r) => r.fields);
}
export function createFieldDef(payload) {
  return apiFetch('/api/custom-fields', { method: 'POST', body: JSON.stringify(payload) }).then((r) => r.field);
}
export function deleteFieldDef(id) {
  return apiFetch(`/api/custom-fields/${id}`, { method: 'DELETE' });
}
export function fetchFieldValues(taskId) {
  return apiFetch(`/api/custom-fields/values/${taskId}`).then((r) => r.values);
}
export function setFieldValue(taskId, fieldId, value) {
  return apiFetch(`/api/custom-fields/values/${taskId}/${fieldId}`, { method: 'PUT', body: JSON.stringify({ value }) }).then((r) => r.value);
}
