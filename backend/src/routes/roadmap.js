import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../lib/auth.js';
import { requireWorkspaceContext, requireWorkspaceRole, canModifyProject } from '../lib/permissions.js';
import { logAudit } from '../lib/audit.js';
import { ROADMAP_TEMPLATES, getRoadmapTemplate } from '../lib/roadmapTemplates.js';
import { applyTemplateToProject } from '../lib/applyRoadmapTemplate.js';
import { recalcProjectProgress } from '../lib/progress.js';

const router = Router();

// Compatibility layer over the Project Template Center's ProjectTemplate
// model, kept so the existing RoadmapTemplatePicker/TemplatePreviewModal/
// CreateTemplateModal/RoadmapTrack.jsx components (which apply a template
// to an *existing* project's Roadmap tab) keep working completely
// unchanged. This is also where the old cross-tenant leak (CustomTemplate
// had no workspaceId at all) gets closed — ProjectTemplate rows are now
// properly scoped to the caller's workspace, same as everything else.
function flattenToLegacyShape(t, tasksByPhase) {
  return {
    key: t.id,
    name: t.name,
    category: t.category,
    description: t.description,
    custom: !t.isSystemTemplate,
    phases: t.phases.map((p) => ({
      title: p.name,
      description: p.description,
      subtasks: (tasksByPhase.get(p.id) || []).map((task) => task.name),
    })),
  };
}

async function dbTemplatesForWorkspace(workspaceId) {
  const rows = await prisma.projectTemplate.findMany({
    where: { isArchived: false, OR: [{ isSystemTemplate: true }, { workspaceId }] },
    include: { phases: { orderBy: { sortOrder: 'asc' } }, tasks: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((t) => {
    // Only direct phase-children (not nested sub-subtasks) fit this legacy
    // flat "phase -> subtask strings" shape — deeper structure is only
    // fully visible through the new Template Center preview.
    const tasksByPhase = new Map();
    for (const task of t.tasks) {
      if (!task.phaseId || task.parentTaskId) continue;
      if (!tasksByPhase.has(task.phaseId)) tasksByPhase.set(task.phaseId, []);
      tasksByPhase.get(task.phaseId).push(task);
    }
    return flattenToLegacyShape(t, tasksByPhase);
  });
}

router.get('/templates', requireAuth, requireWorkspaceContext, async (req, res) => {
  const dbTemplates = await dbTemplatesForWorkspace(req.workspaceId);
  res.json({ templates: [...ROADMAP_TEMPLATES, ...dbTemplates] });
});

// Saves a set of phases (usually built from a project's current roadmap) as
// a reusable template for this workspace only.
router.post('/templates', requireAuth, requireWorkspaceContext, requireWorkspaceRole('ADMIN'), async (req, res) => {
  const { name, description = '', category = 'PROJECT_MANAGEMENT', phases } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  if (!Array.isArray(phases) || phases.length === 0) return res.status(400).json({ error: 'At least one phase is required' });

  const slug = `${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'template'}-${Date.now().toString(36)}`;
  const row = await prisma.$transaction(async (tx) => {
    const tpl = await tx.projectTemplate.create({
      data: {
        slug, name: name.trim(), description: description.trim(), category, industry: 'General',
        isSystemTemplate: false, workspaceId: req.workspaceId, createdById: req.user.id,
      },
    });
    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      const p = await tx.projectTemplatePhase.create({
        data: { templateId: tpl.id, name: phase.title || phase.name || `Phase ${i + 1}`, description: phase.description || '', sortOrder: i },
      });
      const subtasks = phase.subtasks || [];
      for (let j = 0; j < subtasks.length; j++) {
        await tx.projectTemplateTask.create({
          data: { templateId: tpl.id, phaseId: p.id, name: subtasks[j], sortOrder: j },
        });
      }
    }
    return tpl;
  });
  await logAudit(req.user.id, 'create', 'project_template', row.id, { name: row.name }, req.workspaceId);
  res.json({ template: { key: row.id, name: row.name, category: row.category, description: row.description, phases, custom: true } });
});

router.delete('/templates/:id', requireAuth, requireWorkspaceContext, requireWorkspaceRole('ADMIN'), async (req, res) => {
  const row = await prisma.projectTemplate.findUnique({ where: { id: req.params.id } });
  if (!row || row.workspaceId !== req.workspaceId) return res.status(404).json({ error: 'Template not found' });
  if (row.isSystemTemplate) return res.status(403).json({ error: 'System templates cannot be deleted' });
  await prisma.projectTemplate.delete({ where: { id: row.id } });
  await logAudit(req.user.id, 'delete', 'project_template', row.id, { name: row.name }, req.workspaceId);
  res.json({ ok: true });
});

// Applies a template's phases as real top-level tasks (with starter
// subtasks) on an existing project — used by the Roadmap tab for a project
// that doesn't have a roadmap yet.
router.post('/apply', requireAuth, async (req, res) => {
  const { projectId, templateKey, phases: phasesOverride } = req.body;
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (!(await canModifyProject(req.user, projectId))) return res.status(403).json({ error: 'Viewers cannot modify this project' });

  let template;
  if (phasesOverride) {
    if (!Array.isArray(phasesOverride) || phasesOverride.length === 0) {
      return res.status(400).json({ error: 'At least one phase is required' });
    }
    template = { phases: phasesOverride };
  } else {
    template = getRoadmapTemplate(templateKey);
    if (!template) {
      const row = await prisma.projectTemplate.findUnique({
        where: { id: templateKey },
        include: { phases: { orderBy: { sortOrder: 'asc' } }, tasks: { orderBy: { sortOrder: 'asc' } } },
      });
      if (!row || (!row.isSystemTemplate && row.workspaceId !== project.workspaceId)) {
        return res.status(400).json({ error: 'Unknown roadmap template' });
      }
      const tasksByPhase = new Map();
      for (const task of row.tasks) {
        if (!task.phaseId || task.parentTaskId) continue;
        if (!tasksByPhase.has(task.phaseId)) tasksByPhase.set(task.phaseId, []);
        tasksByPhase.get(task.phaseId).push(task);
      }
      template = flattenToLegacyShape(row, tasksByPhase);
    }
  }

  const tasksCreated = await applyTemplateToProject(projectId, template, req.user.id);
  if (tasksCreated > 0) await recalcProjectProgress(projectId);
  await logAudit(req.user.id, 'apply', 'roadmap_template', projectId, { templateKey, tasksCreated, customized: !!phasesOverride }, project.workspaceId);
  res.json({ ok: true, tasksCreated });
});

export default router;
