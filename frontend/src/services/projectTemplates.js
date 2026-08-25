import { apiFetch } from './api';
import { PROJECTS } from './projects';

export const CATEGORY_LABEL = {
  FEATURED: 'Featured',
  STARTUP: 'Startup',
  FUNDRAISING: 'Fundraising',
  RESEARCH_AND_DEVELOPMENT: 'Research & Development',
  MEDTECH: 'MedTech',
  BIOTECH: 'Biotech',
  REGULATORY: 'Regulatory',
  COMPANY_FORMATION: 'Company Formation',
  PROJECT_MANAGEMENT: 'Project Management',
  SOFTWARE_DEVELOPMENT: 'Software Development',
  PRODUCT_MANAGEMENT: 'Product Management',
  MARKETING: 'Marketing',
  SALES_AND_BUSINESS_DEVELOPMENT: 'Sales & Business Development',
  OPERATIONS: 'Operations',
  HR: 'HR',
  LEGAL: 'Legal',
  FINANCE: 'Finance',
  CONSULTING: 'Consulting',
  EVENTS: 'Events',
};

export const CATEGORY_ORDER = [
  'STARTUP', 'FUNDRAISING', 'RESEARCH_AND_DEVELOPMENT', 'MEDTECH', 'BIOTECH', 'REGULATORY', 'COMPANY_FORMATION',
  'PROJECT_MANAGEMENT', 'SOFTWARE_DEVELOPMENT', 'PRODUCT_MANAGEMENT', 'MARKETING', 'SALES_AND_BUSINESS_DEVELOPMENT',
  'OPERATIONS', 'HR', 'LEGAL', 'FINANCE', 'CONSULTING', 'EVENTS',
];

const CAT_TOKENS = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)', 'var(--cat-6)', 'var(--cat-7)', 'var(--cat-8)'];
export function categoryColor(category) {
  const idx = CATEGORY_ORDER.indexOf(category);
  return CAT_TOKENS[(idx === -1 ? 0 : idx) % CAT_TOKENS.length];
}

function qs(params) {
  const parts = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return parts.length ? `?${parts.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')}` : '';
}

export function fetchTemplates(params = {}) {
  return apiFetch(`/api/project-templates${qs(params)}`).then((r) => r.templates);
}

export function fetchTemplateDetail(id) {
  return apiFetch(`/api/project-templates/${id}`).then((r) => r.template);
}

export function duplicateTemplate(id) {
  return apiFetch(`/api/project-templates/${id}/duplicate`, { method: 'POST' }).then((r) => r.template);
}

export function saveProjectAsTemplate(projectId, payload) {
  return apiFetch(`/api/project-templates/from-project/${projectId}`, { method: 'POST', body: JSON.stringify(payload) }).then((r) => r.template);
}

export function updateTemplate(id, patch) {
  return apiFetch(`/api/project-templates/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }).then((r) => r.template);
}

export function deleteTemplate(id) {
  return apiFetch(`/api/project-templates/${id}`, { method: 'DELETE' });
}

export async function instantiateTemplate(id, payload) {
  const result = await apiFetch(`/api/project-templates/${id}/instantiate`, { method: 'POST', body: JSON.stringify(payload) });
  PROJECTS.push(result.project);
  return result;
}
