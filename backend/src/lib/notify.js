import { prisma } from './prisma.js';
import { sendMail } from './mailer.js';
import { broadcast } from './sse.js';

async function postToSlack(text) {
  const row = await prisma.integration.findUnique({ where: { provider: 'slack' } });
  if (!row?.connected) return { sent: false, reason: 'Slack not connected' };
  const cfg = JSON.parse(row.configJson || '{}');
  if (!cfg.webhookUrl) return { sent: false, reason: 'Slack not connected' };
  try {
    const res = await fetch(cfg.webhookUrl, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }),
    });
    return { sent: res.ok, reason: res.ok ? null : `Slack responded ${res.status}` };
  } catch (e) {
    return { sent: false, reason: e.message };
  }
}

// Pushes an in-app notification, and best-effort mirrors it to Slack/email
// when those channels are configured. Never throws — notification delivery
// failures shouldn't break the calling mutation.
export async function notifyUser(userId, { text, projectId = null, taskId = null, invitationId = null, icon = 'i-bell', color = 'var(--brand-500)', urgent = false }) {
  const notif = await prisma.notification.create({
    data: { userId, icon, color, text, projectId, taskId, invitationId, unread: true },
  });

  postToSlack(`:bell: *MujuzPM* — ${text}`).catch(() => {});
  broadcast('notification', { userId, id: notif.id, text, icon, color, projectId, taskId, invitationId, time: notif.time });

  if (urgent) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      sendMail({ to: user.email, subject: 'MujuzPM notification', html: `<p>${text}</p>` }).catch(() => {});
    }
  }

  return notif;
}
