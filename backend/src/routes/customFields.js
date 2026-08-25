import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../lib/auth.js';
import { canAccessProject, canModifyProject, projectIdForTask, workspaceIdForProject } from '../lib/permissions.js';
import { logAudit } from '../lib/audit.js';
import { customFieldDefOut } from '../lib/serialize.js';

const router = Router();
const TYPES = ['text', 'number', 'select', 'date', 'checkbox'];

router.get('/', requireAuth, async (req, res) => {
  if (!req.query.projectId) return res.status(400).json({ error: 'projectId is required' });
  if (!(await canAccessProject(req.user, req.query.projectId))) return res.status(403).json({ error: 'You do not have access to this project' });
  const rows = await prisma.customFieldDef.findMany({ where: { projectId: req.query.projectId }, orderBy: { order: 'asc' } });
  res.json({ fields: rows.map(customFieldDefOut) });
});

router.post('/', requireAuth, async (req, res) => {
  const { projectId, name, type, options = [] } = req.body;
  if (!projectId || !name?.trim() || !TYPES.includes(type)) return res.status(400).json({ error: 'projectId, name and a valid type are required' });
  if (!(await canModifyProject(req.user, projectId))) return res.status(403).json({ error: 'Viewers cannot create custom fields' });

  const count = await prisma.customFieldDef.count({ where: { projectId } });
  const field = await prisma.customFieldDef.create({
    data: { projectId, name: name.trim(), type, optionsJson: JSON.stringify(options), order: count },
  });
  await logAudit(req.user.id, 'create', 'custom_field', field.id, { name: field.name, projectId }, await workspaceIdForProject(projectId));
  res.json({ field: customFieldDefOut(field) });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const existing = await prisma.customFieldDef.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Field not found' });
  if (!(await canModifyProject(req.user, existing.projectId))) return res.status(403).json({ error: 'Viewers cannot delete custom fields' });
  await prisma.customFieldValue.deleteMany({ where: { fieldId: existing.id } });
  await prisma.customFieldDef.delete({ where: { id: existing.id } });
  await logAudit(req.user.id, 'delete', 'custom_field', existing.id, { name: existing.name }, await workspaceIdForProject(existing.projectId));
  res.json({ ok: true });
});

// All custom field values for one task, keyed by fieldId — the shape
// TaskPanel wants to render an editable row per project field definition.
router.get('/values/:taskId', requireAuth, async (req, res) => {
  const projectId = await projectIdForTask(req.params.taskId);
  if (!projectId) return res.status(404).json({ error: 'Task not found' });
  if (!(await canAccessProject(req.user, projectId))) return res.status(403).json({ error: 'You do not have access to this project' });
  const rows = await prisma.customFieldValue.findMany({ where: { taskId: req.params.taskId } });
  res.json({ values: Object.fromEntries(rows.map((r) => [r.fieldId, r.value])) });
});

// Validates a raw value against its field definition's declared type before
// it's ever written — an empty string always clears the value regardless of type.
function validateFieldValue(field, raw) {
  const value = String(raw);
  if (value === '') return null;
  switch (field.type) {
    case 'number':
      if (!Number.isFinite(Number(value))) return `"${field.name}" needs a number`;
      return null;
    case 'date':
      if (Number.isNaN(Date.parse(value))) return `"${field.name}" needs a valid date`;
      return null;
    case 'checkbox':
      if (value !== 'true' && value !== 'false') return `"${field.name}" needs to be checked or unchecked`;
      return null;
    case 'select': {
      const options = JSON.parse(field.optionsJson || '[]');
      if (!options.includes(value)) return `"${field.name}" must be one of: ${options.join(', ')}`;
      return null;
    }
    default:
      return null;
  }
}

router.put('/values/:taskId/:fieldId', requireAuth, async (req, res) => {
  const { value = '' } = req.body;
  const field = await prisma.customFieldDef.findUnique({ where: { id: req.params.fieldId } });
  if (!field) return res.status(404).json({ error: 'Field not found' });
  if (!(await canModifyProject(req.user, field.projectId))) return res.status(403).json({ error: 'Viewers cannot edit custom field values' });
  const error = validateFieldValue(field, value);
  if (error) return res.status(400).json({ error });
  const row = await prisma.customFieldValue.upsert({
    where: { taskId_fieldId: { taskId: req.params.taskId, fieldId: req.params.fieldId } },
    update: { value: String(value) },
    create: { taskId: req.params.taskId, fieldId: req.params.fieldId, value: String(value) },
  });
  res.json({ value: row.value });
});

export default router;
