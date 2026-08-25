// A tiny Server-Sent Events hub — every connected browser tab holds one
// open HTTP response; broadcasting writes a JSON event to all of them.
// Chosen over WebSockets because it's one-directional (server → client is
// all this app needs; writes still go through normal REST) and needs no
// extra dependency or protocol upgrade, so it works through the same Vite
// dev proxy as everything else.
const clients = new Set();

export function addClient(res) {
  clients.add(res);
}

export function removeClient(res) {
  clients.delete(res);
}

export function broadcast(type, payload) {
  const line = `data: ${JSON.stringify({ type, payload, at: Date.now() })}\n\n`;
  for (const res of clients) {
    res.write(line);
  }
}

export function clientCount() {
  return clients.size;
}
