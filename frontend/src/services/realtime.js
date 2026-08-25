import { getToken } from './api';

const listeners = new Set();
let source = null;

// One shared EventSource for the whole app — every consumer (task store,
// notification bell, project chat) subscribes to the same stream instead
// of opening its own connection.
export function connectRealtime() {
  if (source) return;
  const token = getToken();
  if (!token) return;
  source = new EventSource(`/api/events/stream?token=${encodeURIComponent(token)}`);
  source.onmessage = (e) => {
    let msg;
    try { msg = JSON.parse(e.data); } catch { return; }
    for (const fn of listeners) fn(msg);
  };
  source.onerror = () => {
    // EventSource retries the connection itself; nothing to do here beyond
    // not crashing the tab if the backend restarts mid-session.
  };
}

export function disconnectRealtime() {
  source?.close();
  source = null;
}

export function onRealtime(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
