import { Router } from 'express';
import multer from 'multer';
import { nanoid } from 'nanoid';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../lib/auth.js';
import { canAccessProject, canEditTask, projectIdForTask, workspaceIdForTask } from '../lib/permissions.js';
import { logAudit } from '../lib/audit.js';
import { supabase } from '../lib/supabase.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const router = Router();

router.post('/tasks/:taskId/attachments', requireAuth, upload.single('file'), async (req, res) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  if (!(await canEditTask(req.user, task.projectId))) {
    return res.status(403).json({ error: 'Viewers cannot attach files' });
  }

  const storedName = `${nanoid(10)}__${req.file.originalname}`;
  
  const { error } = await supabase.storage
    .from('attachments')
    .upload(storedName, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false
    });

  if (error) {
    console.error('Supabase storage upload error:', error);
    return res.status(500).json({ error: 'Failed to upload to storage' });
  }

  const record = await prisma.attachment.create({
    data: {
      taskId: task.id, filename: req.file.originalname, storedName,
      mimeType: req.file.mimetype, size: req.file.size, uploadedById: req.user.id,
    },
  });
  await logAudit(req.user.id, 'attach_file', 'task', task.id, { filename: record.filename }, await workspaceIdForTask(task.id));
  res.json({ attachment: record });
});

router.get('/task/:taskId', requireAuth, async (req, res) => {
  const projectId = await projectIdForTask(req.params.taskId);
  if (!projectId) return res.status(404).json({ error: 'Task not found' });
  if (!(await canAccessProject(req.user, projectId))) return res.status(403).json({ error: 'You do not have access to this project' });
  const attachments = await prisma.attachment.findMany({ where: { taskId: req.params.taskId } });
  res.json({ attachments });
});

router.get('/:id/download', requireAuth, async (req, res) => {
  const record = await prisma.attachment.findUnique({ where: { id: req.params.id } });
  if (!record) return res.status(404).json({ error: 'Attachment not found' });
  if (!(await canAccessProject(req.user, (await projectIdForTask(record.taskId))))) return res.status(403).json({ error: 'You do not have access to this project' });
  
  const { data, error } = await supabase.storage
    .from('attachments')
    .createSignedUrl(record.storedName, 60, { download: record.filename });
    
  if (error || !data?.signedUrl) {
    console.error('Supabase storage sign URL error:', error);
    return res.status(500).json({ error: 'Failed to generate download link' });
  }
  
  res.redirect(data.signedUrl);
});

router.delete('/:id', requireAuth, async (req, res) => {
  const record = await prisma.attachment.findUnique({ where: { id: req.params.id } });
  if (!record) return res.status(404).json({ error: 'Attachment not found' });
  const projectId = await projectIdForTask(record.taskId);
  if (!(await canEditTask(req.user, projectId))) return res.status(403).json({ error: 'Viewers cannot delete attachments' });
  
  await prisma.attachment.delete({ where: { id: req.params.id } });
  
  const { error } = await supabase.storage.from('attachments').remove([record.storedName]);
  if (error) console.error('Failed to remove attachment from storage:', error);
  
  await logAudit(req.user.id, 'remove_attachment', 'task', record.taskId, { filename: record.filename }, await workspaceIdForTask(record.taskId));
  res.json({ ok: true });
});

export default router;
