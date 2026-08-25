import crypto from 'node:crypto';
import { prisma } from './prisma.js';

const KEY_PREFIX = 'mujuz_live_';

export function generateApiKey() {
  const raw = KEY_PREFIX + crypto.randomBytes(24).toString('hex');
  const keyHash = crypto.createHash('sha256').update(raw).digest('hex');
  const keyPrefix = raw.slice(0, KEY_PREFIX.length + 8);
  return { raw, keyHash, keyPrefix };
}

// Auth for the public REST API (/api/v1/...) — a raw API key in the
// Authorization header, separate from the JWT session used by the app UI.
export async function requireApiKey(req, res, next) {
  const header = req.headers.authorization || '';
  const raw = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!raw) return res.status(401).json({ error: 'Missing API key. Pass it as: Authorization: Bearer <key>' });

  const keyHash = crypto.createHash('sha256').update(raw).digest('hex');
  const key = await prisma.apiKey.findUnique({ where: { keyHash } });
  if (!key || key.revokedAt) return res.status(401).json({ error: 'Invalid or revoked API key' });

  const user = await prisma.user.findUnique({ where: { id: key.userId } });
  if (!user) return res.status(401).json({ error: 'Invalid API key' });

  prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  req.user = user;
  req.apiKeyId = key.id;
  next();
}
