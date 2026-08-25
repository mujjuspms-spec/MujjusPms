import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../lib/auth.js';
import { logAudit } from '../lib/audit.js';
import { generateApiKey } from '../lib/apiAuth.js';

const router = Router();

function keyOut(k) {
  return { id: k.id, name: k.name, keyPrefix: k.keyPrefix, createdAt: k.createdAt, lastUsedAt: k.lastUsedAt, revokedAt: k.revokedAt };
}

router.get('/', requireAuth, async (req, res) => {
  const rows = await prisma.apiKey.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } });
  res.json({ keys: rows.map(keyOut) });
});

router.post('/', requireAuth, async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });

  const { raw, keyHash, keyPrefix } = generateApiKey();
  const key = await prisma.apiKey.create({ data: { userId: req.user.id, name: name.trim(), keyHash, keyPrefix } });
  await logAudit(req.user.id, 'create', 'apikey', key.id, { name: key.name });
  // The raw key is only ever returned here, at creation — it isn't
  // recoverable afterward, matching every major API key UX (GitHub, Stripe…).
  res.json({ key: keyOut(key), rawKey: raw });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const key = await prisma.apiKey.findUnique({ where: { id: req.params.id } });
  if (!key || key.userId !== req.user.id) return res.status(404).json({ error: 'Key not found' });
  await prisma.apiKey.update({ where: { id: key.id }, data: { revokedAt: new Date() } });
  await logAudit(req.user.id, 'revoke', 'apikey', key.id, { name: key.name });
  res.json({ ok: true });
});

export default router;
