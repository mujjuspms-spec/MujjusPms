import { supabase } from './supabase';

const ACTIVE_WORKSPACE_KEY = 'mujuz-active-workspace';

let cachedToken = null;

supabase.auth.onAuthStateChange((event, session) => {
  cachedToken = session?.access_token || null;
});

export async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) cachedToken = session.access_token;
  return session?.access_token || null;
}

export function getTokenSync() {
  return cachedToken;
}

export function getActiveWorkspaceId() {
  return localStorage.getItem(ACTIVE_WORKSPACE_KEY) || null;
}
export function setActiveWorkspaceId(id) {
  if (id) localStorage.setItem(ACTIVE_WORKSPACE_KEY, id);
  else localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
}

export async function apiFetch(path, opts = {}) {
  const token = await getToken();
  const workspaceId = getActiveWorkspaceId();
  const headers = { ...(opts.headers || {}) };
  if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (workspaceId) headers['X-Workspace-Id'] = workspaceId;

  const res = await fetch(path, { ...opts, headers });
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

export function uploadFile(path, file) {
  const form = new FormData();
  form.append('file', file);
  return apiFetch(path, { method: 'POST', body: form });
}

export function downloadUrl(attachmentId) {
  const token = getTokenSync();
  return `/api/attachments/${attachmentId}/download?token=${encodeURIComponent(token || '')}`;
}
