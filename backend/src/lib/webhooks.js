import crypto from 'node:crypto';
import { prisma } from './prisma.js';

// Fires every enabled webhook subscribed to `event`, POSTing an
// HMAC-SHA256-signed JSON payload. Fire-and-forget: a slow or failing
// endpoint on the receiving end must never block or fail the request that
// triggered it, so delivery errors are swallowed (not surfaced to the API
// caller) — this mirrors how GitHub/Stripe webhook delivery is decoupled
// from the originating request.
export async function dispatchWebhook(event, payload) {
  let hooks;
  try {
    hooks = await prisma.webhook.findMany({ where: { enabled: true } });
  } catch {
    return;
  }
  const body = JSON.stringify({ event, payload, sentAt: new Date().toISOString() });

  for (const hook of hooks) {
    let events;
    try { events = JSON.parse(hook.eventsJson || '[]'); } catch { events = []; }
    if (!events.includes(event)) continue;

    const signature = crypto.createHmac('sha256', hook.secret).update(body).digest('hex');
    fetch(hook.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-MujuzPM-Signature': `sha256=${signature}`, 'X-MujuzPM-Event': event },
      body,
    }).catch((e) => console.error(`Webhook delivery failed for ${hook.url}:`, e.message));
  }
}
