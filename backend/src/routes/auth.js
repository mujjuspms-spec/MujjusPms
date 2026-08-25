import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { prisma } from '../lib/prisma.js';
import { requireAuth, publicUser } from '../lib/auth.js';
import { logAudit } from '../lib/audit.js';

const router = Router();

// /register and /login endpoints have been removed. 
// Authentication is handled entirely by Supabase on the frontend.
// The requireAuth middleware automatically provisions User profiles.

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const TEXT_FIELDS = ['phone', 'department', 'location', 'timezone', 'about'];

router.patch('/me', requireAuth, async (req, res) => {
  const { name, role, capacity, workDays, workStart, workEnd } = req.body;
  const data = {};
  const changes = [];

  if (name?.trim() && name.trim() !== req.user.name) {
    changes.push({ field: 'name', from: req.user.name, to: name.trim() });
    data.name = name.trim();
    data.initials = name.trim().split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  }
  if (role !== undefined && role.trim() !== req.user.role) {
    changes.push({ field: 'role', from: req.user.role, to: role.trim() });
    data.role = role.trim();
  }
  for (const field of TEXT_FIELDS) {
    const value = req.body[field];
    if (value !== undefined && value.trim() !== req.user[field]) {
      changes.push({ field, from: req.user[field], to: value.trim() });
      data[field] = value.trim();
    }
  }
  if (capacity !== undefined) {
    const next = Number(capacity);
    if (!Number.isInteger(next) || next <= 0) return res.status(400).json({ error: 'Weekly capacity must be a positive whole number' });
    if (next !== req.user.capacity) {
      changes.push({ field: 'capacity', from: req.user.capacity, to: next });
      data.capacity = next;
    }
  }
  if (workStart !== undefined || workEnd !== undefined) {
    const start = workStart ?? req.user.workStart;
    const end = workEnd ?? req.user.workEnd;
    if (!TIME_RE.test(start) || !TIME_RE.test(end) || start >= end) {
      return res.status(400).json({ error: 'Working hours must be valid times with start before end' });
    }
    if (start !== req.user.workStart) { changes.push({ field: 'workStart', from: req.user.workStart, to: start }); data.workStart = start; }
    if (end !== req.user.workEnd) { changes.push({ field: 'workEnd', from: req.user.workEnd, to: end }); data.workEnd = end; }
  }
  if (workDays !== undefined) {
    if (!Array.isArray(workDays)) return res.status(400).json({ error: 'workDays must be a list of days' });
    const next = JSON.stringify(workDays);
    if (next !== req.user.workDays) { changes.push({ field: 'workDays', from: req.user.workDays, to: next }); data.workDays = next; }
  }

  const user = Object.keys(data).length ? await prisma.user.update({ where: { id: req.user.id }, data }) : req.user;
  for (const change of changes) {
    await logAudit(req.user.id, 'update', 'user', req.user.id, change);
  }
  res.json({ user: publicUser(user) });
});

export default router;
