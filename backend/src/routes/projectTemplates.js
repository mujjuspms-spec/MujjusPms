import { Router } from 'express';
import { nanoid } from 'nanoid';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../lib/auth.js';
import { requireWorkspaceContext, requireWorkspaceRole, requireAdmin } from '../lib/permissions.js';
import { logAudit } from '../lib/audit.js';
import { dispatchWebhook } from '../lib/webhooks.js';
import { recalcProjectProgress } from '../lib/progress.js';
import { projectOut } from '../lib/serialize.js';

const router = Router();

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatDisplayDate(d) {
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function parseStartDate(start) {
  const d = new Date(start);
  return isNaN(d) ? new Date() : d;
}
function slugify(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'template';
}
async function uniqueTemplateSlug(base) {
  let slug = base;
  let n = 1;
  while (await prisma.projectTemplate.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

function templateSummaryOut(t) {
  return {
    id: t.id, slug: t.slug, name: t.name, description: t.description, category: t.category,
    industry: t.industry, icon: t.icon, featured: t.featured, tags: JSON.parse(t.tagsJson || '[]'),
    defaultView: t.defaultView, isSystemTemplate: t.isSystemTemplate, workspaceId: t.workspaceId,
    isArchived: t.isArchived, version: t.version,
    phaseCount: t._count.phases, taskCount: t._count.tasks,
    milestoneCount: t._count.milestones, customFieldCount: t._count.customFields,
  };
}

// Builds a phase -> task -> nested-subtask tree for the preview modal,
// mirroring the same parent/children shape real Tasks already use.
function buildTaskTree(tasks, phaseId, parentTaskId = null) {
  return tasks
    .filter((t) => t.phaseId === phaseId && t.parentTaskId === parentTaskId)
    .map((t) => ({
      id: t.id, name: t.name, description: t.description, defaultStatus: t.defaultStatus,
      defaultPriority: t.defaultPriority, estimatedDays: t.estimatedDays,
      dependsOn: JSON.parse(t.dependsOnJson || '[]'),
      children: buildTaskTree(tasks, phaseId, t.id),
    }));
}
function templateDetailOut(t) {
  return {
    id: t.id, slug: t.slug, name: t.name, description: t.description, category: t.category, industry: t.industry,
    icon: t.icon, featured: t.featured, tags: JSON.parse(t.tagsJson || '[]'), defaultView: t.defaultView,
    isSystemTemplate: t.isSystemTemplate, workspaceId: t.workspaceId, version: t.version,
    phases: t.phases.map((p) => ({ id: p.id, name: p.name, description: p.description, tasks: buildTaskTree(t.tasks, p.id) })),
    milestones: t.milestones.map((m) => ({ id: m.id, name: m.name, relativeDay: m.relativeDay })),
    customFields: t.customFields.map((f) => ({ id: f.id, name: f.name, type: f.type, options: JSON.parse(f.optionsJson || '[]') })),
  };
}

function visibleWhere(workspaceId) {
  return { OR: [{ isSystemTemplate: true }, { workspaceId }] };
}

// Gallery summary only — never loads the full hierarchy, so browsing the
// Template Center stays cheap regardless of how large individual templates get.
router.get('/', requireAuth, requireWorkspaceContext, async (req, res) => {
  const { search, category, industry, featured, mine } = req.query;
  const where = { isArchived: false, ...visibleWhere(req.workspaceId) };
  if (mine === 'true') {
    delete where.OR;
    where.workspaceId = req.workspaceId;
    where.isSystemTemplate = false;
  }
  if (category) where.category = category;
  if (industry) where.industry = industry;
  if (featured === 'true') where.featured = true;
  if (search?.trim()) {
    const q = search.trim();
    where.AND = [{ OR: [
      { name: { contains: q } }, { description: { contains: q } }, { category: { contains: q } }, { tagsJson: { contains: q } },
    ] }];
  }
  const rows = await prisma.projectTemplate.findMany({
    where,
    include: { _count: { select: { phases: true, tasks: true, milestones: true, customFields: true } } },
    orderBy: [{ featured: 'desc' }, { name: 'asc' }],
  });
  res.json({ templates: rows.map(templateSummaryOut) });
});

router.get('/:id', requireAuth, requireWorkspaceContext, async (req, res) => {
  const t = await prisma.projectTemplate.findUnique({
    where: { id: req.params.id },
    include: {
      phases: { orderBy: { sortOrder: 'asc' } },
      tasks: { orderBy: { sortOrder: 'asc' } },
      milestones: { orderBy: { sortOrder: 'asc' } },
      customFields: { orderBy: { sortOrder: 'asc' } },
    },
  });
  if (!t || (!t.isSystemTemplate && t.workspaceId !== req.workspaceId)) return res.status(404).json({ error: 'Template not found' });
  res.json({ template: templateDetailOut(t) });
});

// Deep-copies any template this workspace can see into a new, independently
// editable workspace-owned copy. System templates are never edited in
// place — this is the only way to customize one.
router.post('/:id/duplicate', requireAuth, requireWorkspaceContext, requireWorkspaceRole('ADMIN'), async (req, res) => {
  const src = await prisma.projectTemplate.findUnique({
    where: { id: req.params.id },
    include: { phases: true, tasks: true, milestones: true, customFields: true },
  });
  if (!src || (!src.isSystemTemplate && src.workspaceId !== req.workspaceId)) return res.status(404).json({ error: 'Template not found' });

  const slug = await uniqueTemplateSlug(`${src.slug}-copy`);
  const copy = await prisma.$transaction(async (tx) => {
    const tpl = await tx.projectTemplate.create({
      data: {
        slug, name: `${src.name} (copy)`, description: src.description, category: src.category, industry: src.industry,
        icon: src.icon, featured: false, tagsJson: src.tagsJson, defaultView: src.defaultView,
        isSystemTemplate: false, workspaceId: req.workspaceId, createdById: req.user.id,
      },
    });
    const phaseIdMap = new Map();
    for (const p of src.phases) {
      const np = await tx.projectTemplatePhase.create({ data: { templateId: tpl.id, name: p.name, description: p.description, sortOrder: p.sortOrder } });
      phaseIdMap.set(p.id, np.id);
    }
    const taskIdMap = new Map();
    let remaining = src.tasks.slice();
    let guard = 0;
    while (remaining.length && guard < 20) {
      guard++;
      const next = [];
      for (const t of remaining) {
        if (t.parentTaskId && !taskIdMap.has(t.parentTaskId)) { next.push(t); continue; }
        const nt = await tx.projectTemplateTask.create({
          data: {
            templateId: tpl.id, phaseId: t.phaseId ? phaseIdMap.get(t.phaseId) : null,
            parentTaskId: t.parentTaskId ? taskIdMap.get(t.parentTaskId) : null,
            name: t.name, description: t.description, sortOrder: t.sortOrder,
            defaultStatus: t.defaultStatus, defaultPriority: t.defaultPriority, estimatedDays: t.estimatedDays,
          },
        });
        taskIdMap.set(t.id, nt.id);
      }
      remaining = next;
    }
    for (const t of src.tasks) {
      const deps = JSON.parse(t.dependsOnJson || '[]').map((id) => taskIdMap.get(id)).filter(Boolean);
      if (deps.length) await tx.projectTemplateTask.update({ where: { id: taskIdMap.get(t.id) }, data: { dependsOnJson: JSON.stringify(deps) } });
    }
    for (const m of src.milestones) {
      await tx.projectTemplateMilestone.create({ data: { templateId: tpl.id, name: m.name, relativeDay: m.relativeDay, sortOrder: m.sortOrder } });
    }
    for (const f of src.customFields) {
      await tx.projectTemplateCustomField.create({ data: { templateId: tpl.id, name: f.name, type: f.type, optionsJson: f.optionsJson, sortOrder: f.sortOrder } });
    }
    return tpl;
  });
  await logAudit(req.user.id, 'duplicate', 'project_template', copy.id, { fromTemplateId: src.id, fromTemplateName: src.name }, req.workspaceId);
  res.status(201).json({
    template: templateSummaryOut({
      ...copy,
      _count: { phases: src.phases.length, tasks: src.tasks.length, milestones: src.milestones.length, customFields: src.customFields.length },
    }),
  });
});

// "Save as Template" — captures an existing project's current structure
// into a new workspace template. Never captures comments, attachments,
// activity history, real assignees, or timestamps — only what's explicitly
// selected below.
router.post('/from-project/:projectId', requireAuth, requireWorkspaceContext, requireWorkspaceRole('ADMIN'), async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
  if (!project || project.workspaceId !== req.workspaceId) return res.status(404).json({ error: 'Project not found' });

  const {
    name, description = '', category = 'PROJECT_MANAGEMENT',
    includeHierarchy = true, includeMilestones = true, includeDependencies = true, includeCustomFields = true,
  } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });

  const allTasks = includeHierarchy ? await prisma.task.findMany({ where: { projectId: project.id }, orderBy: { order: 'asc' } }) : [];
  const topLevel = allTasks.filter((t) => !t.parentId);
  const fields = includeCustomFields ? await prisma.customFieldDef.findMany({ where: { projectId: project.id }, orderBy: { order: 'asc' } }) : [];
  const slug = await uniqueTemplateSlug(slugify(name));

  const tpl = await prisma.$transaction(async (tx) => {
    const tpl = await tx.projectTemplate.create({
      data: {
        slug, name: name.trim(), description: description.trim(), category, industry: 'General',
        isSystemTemplate: false, workspaceId: req.workspaceId, createdById: req.user.id,
      },
    });

    const taskIdMap = new Map(); // real Task id -> new ProjectTemplateTask id
    for (let i = 0; i < topLevel.length; i++) {
      const phaseTask = topLevel[i];
      const phase = await tx.projectTemplatePhase.create({
        data: { templateId: tpl.id, name: phaseTask.title, description: phaseTask.desc || '', sortOrder: i },
      });
      const parentRealToTplId = new Map([[phaseTask.id, null]]);
      let level = allTasks.filter((t) => t.parentId === phaseTask.id);
      while (level.length) {
        const nextLevel = [];
        for (let j = 0; j < level.length; j++) {
          const t = level[j];
          const nt = await tx.projectTemplateTask.create({
            data: {
              templateId: tpl.id, phaseId: phase.id, parentTaskId: parentRealToTplId.get(t.parentId) ?? null,
              name: t.title, description: t.desc || '', sortOrder: j, defaultStatus: 'todo', defaultPriority: t.priority || 'medium',
            },
          });
          taskIdMap.set(t.id, nt.id);
          parentRealToTplId.set(t.id, nt.id);
          nextLevel.push(...allTasks.filter((c) => c.parentId === t.id));
        }
        level = nextLevel;
      }
    }
    if (includeDependencies) {
      for (const t of allTasks) {
        if (!taskIdMap.has(t.id)) continue;
        const deps = JSON.parse(t.dependsOnJson || '[]').map((id) => taskIdMap.get(id)).filter(Boolean);
        if (deps.length) await tx.projectTemplateTask.update({ where: { id: taskIdMap.get(t.id) }, data: { dependsOnJson: JSON.stringify(deps) } });
      }
    }
    if (includeMilestones) {
      // Reuse the exact same derivation the rest of the app already uses for
      // "milestones": top-4 soonest-due top-level tasks with a real due date.
      const startDate = parseStartDate(project.start);
      const withDue = topLevel.filter((t) => t.due && t.due !== 'Unscheduled' && !isNaN(new Date(t.due)));
      const sorted = [...withDue].sort((a, b) => new Date(a.due) - new Date(b.due)).slice(0, 4);
      for (let i = 0; i < sorted.length; i++) {
        const days = Math.round((new Date(sorted[i].due) - startDate) / 86400000);
        await tx.projectTemplateMilestone.create({
          data: { templateId: tpl.id, name: sorted[i].title, relativeDay: Number.isFinite(days) ? days : 0, sortOrder: i },
        });
      }
    }
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      await tx.projectTemplateCustomField.create({
        data: { templateId: tpl.id, name: f.name, type: f.type, optionsJson: f.optionsJson, sortOrder: i },
      });
    }
    return tpl;
  });
  await logAudit(req.user.id, 'create', 'project_template', tpl.id, { name: tpl.name, fromProjectId: project.id }, req.workspaceId);
  res.status(201).json({ template: { id: tpl.id, slug: tpl.slug, name: tpl.name } });
});

router.patch('/:id', requireAuth, requireWorkspaceContext, requireWorkspaceRole('ADMIN'), async (req, res) => {
  const tpl = await prisma.projectTemplate.findUnique({ where: { id: req.params.id } });
  if (!tpl || tpl.workspaceId !== req.workspaceId) return res.status(404).json({ error: 'Template not found' });
  if (tpl.isSystemTemplate) return res.status(403).json({ error: 'System templates cannot be edited directly — duplicate it first' });

  const { name, description, category, isArchived } = req.body;
  const data = {};
  if (name !== undefined) data.name = name.trim();
  if (description !== undefined) data.description = description.trim();
  if (category !== undefined) data.category = category;
  if (isArchived !== undefined) data.isArchived = !!isArchived;
  await prisma.projectTemplate.update({ where: { id: tpl.id }, data });

  const updated = await prisma.projectTemplate.findUnique({
    where: { id: tpl.id },
    include: { _count: { select: { phases: true, tasks: true, milestones: true, customFields: true } } },
  });
  await logAudit(req.user.id, 'update', 'project_template', tpl.id, data, req.workspaceId);
  res.json({ template: templateSummaryOut(updated) });
});

router.delete('/:id', requireAuth, requireWorkspaceContext, requireWorkspaceRole('ADMIN'), async (req, res) => {
  const tpl = await prisma.projectTemplate.findUnique({ where: { id: req.params.id } });
  if (!tpl || tpl.workspaceId !== req.workspaceId) return res.status(404).json({ error: 'Template not found' });
  if (tpl.isSystemTemplate) return res.status(403).json({ error: 'System templates cannot be deleted' });
  await prisma.projectTemplate.delete({ where: { id: tpl.id } });
  await logAudit(req.user.id, 'delete', 'project_template', tpl.id, { name: tpl.name }, req.workspaceId);
  res.json({ ok: true });
});

// The core "Use Template" action — same creation gate as a blank project
// (workspace Admin/Owner only; no separate "member can create" permission
// exists anywhere in this app to extend). Everything lands in one
// transaction so a mid-way failure never leaves a half-built project.
router.post('/:id/instantiate', requireAuth, requireWorkspaceContext, requireAdmin, async (req, res) => {
  const template = await prisma.projectTemplate.findUnique({
    where: { id: req.params.id },
    include: {
      phases: { orderBy: { sortOrder: 'asc' } },
      tasks: { orderBy: { sortOrder: 'asc' } },
      milestones: { orderBy: { sortOrder: 'asc' } },
      customFields: { orderBy: { sortOrder: 'asc' } },
    },
  });
  if (!template || (!template.isSystemTemplate && template.workspaceId !== req.workspaceId)) {
    return res.status(404).json({ error: 'Template not found' });
  }

  const {
    name, ownerId, teamMemberIds = [], start = 'Unscheduled', due = 'Unscheduled',
    health = 'good', excludePhaseIds = [], excludeTaskIds = [],
  } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  const effectiveOwnerId = ownerId || req.user.id;

  const excludedPhases = new Set(excludePhaseIds);
  const excludedTasks = new Set(excludeTaskIds);
  const taskById = new Map(template.tasks.map((t) => [t.id, t]));
  function isTaskExcluded(t) {
    if (excludedTasks.has(t.id)) return true;
    if (t.phaseId && excludedPhases.has(t.phaseId)) return true;
    let p = t.parentTaskId ? taskById.get(t.parentTaskId) : null;
    while (p) {
      if (excludedTasks.has(p.id)) return true;
      p = p.parentTaskId ? taskById.get(p.parentTaskId) : null;
    }
    return false;
  }
  const includedTasks = template.tasks.filter((t) => !isTaskExcluded(t));
  const includedTaskIds = new Set(includedTasks.map((t) => t.id));

  const project = await prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        id: nanoid(8), name: name.trim(), desc: template.description, client: '', due, start,
        budget: 0, spent: 0, currency: 'USD', health, progress: 0, integrationsJson: '[]',
        ownerId: effectiveOwnerId, workspaceId: req.workspaceId,
        sourceTemplateId: template.id, sourceTemplateVersion: template.version,
      },
    });

    // One real top-level Task per phase (the phase itself), so the phase
    // grouping survives instantiation — a template task with no
    // parentTaskId sits directly under its phase's task; deeper nesting
    // (parentTaskId set) becomes further-nested subtasks, exactly like the
    // preview's own tree.
    const phaseTaskId = new Map(); // template phaseId -> real Task id
    let phaseOrder = 0;
    for (const phase of template.phases) {
      if (excludedPhases.has(phase.id)) continue;
      const real = await tx.task.create({
        data: {
          projectId: project.id, parentId: null, title: phase.name, desc: phase.description || null,
          status: 'todo', priority: 'medium', assigneeId: effectiveOwnerId,
          due: 'Unscheduled', order: phaseOrder++, createdById: req.user.id,
        },
      });
      phaseTaskId.set(phase.id, real.id);
    }

    const idMap = new Map(); // template task id -> real Task id
    let remaining = includedTasks.slice();
    let guard = 0;
    while (remaining.length && guard < 20) {
      guard++;
      const next = [];
      for (const t of remaining) {
        if (t.parentTaskId) {
          if (!idMap.has(t.parentTaskId)) { next.push(t); continue; }
        } else if (t.phaseId && !phaseTaskId.has(t.phaseId)) {
          continue; // phase itself was excluded
        }
        const parentId = t.parentTaskId ? idMap.get(t.parentTaskId) : (t.phaseId ? phaseTaskId.get(t.phaseId) : null);
        const real = await tx.task.create({
          data: {
            projectId: project.id, parentId,
            title: t.name, desc: t.description || null, status: t.defaultStatus, priority: t.defaultPriority,
            assigneeId: effectiveOwnerId, due: 'Unscheduled', order: t.sortOrder, createdById: req.user.id,
          },
        });
        idMap.set(t.id, real.id);
      }
      remaining = next;
    }

    for (const m of template.milestones) {
      const dueDate = addDays(parseStartDate(start), m.relativeDay);
      await tx.task.create({
        data: {
          projectId: project.id, parentId: null, title: m.name, desc: null,
          status: 'todo', priority: 'medium', assigneeId: effectiveOwnerId,
          due: formatDisplayDate(dueDate), order: 1000 + m.sortOrder, createdById: req.user.id,
        },
      });
    }

    for (const t of includedTasks) {
      const deps = JSON.parse(t.dependsOnJson || '[]').filter((id) => includedTaskIds.has(id)).map((id) => idMap.get(id)).filter(Boolean);
      if (deps.length) await tx.task.update({ where: { id: idMap.get(t.id) }, data: { dependsOnJson: JSON.stringify(deps) } });
    }

    for (let i = 0; i < template.customFields.length; i++) {
      const f = template.customFields[i];
      await tx.customFieldDef.create({
        data: { projectId: project.id, name: f.name, type: f.type, optionsJson: f.optionsJson, order: i },
      });
    }

    for (const uid of teamMemberIds) {
      if (uid === effectiveOwnerId) continue;
      await tx.projectMember.create({ data: { projectId: project.id, userId: uid, role: 'member' } }).catch(() => {});
    }

    return project;
  });

  await recalcProjectProgress(project.id);
  await logAudit(req.user.id, 'create_from_template', 'project', project.id, { templateId: template.id, templateSlug: template.slug }, req.workspaceId);
  const finalProject = await prisma.project.findUnique({ where: { id: project.id } });
  dispatchWebhook('project.created', projectOut(finalProject));
  res.status(201).json({ project: projectOut(finalProject, 'admin'), defaultView: template.defaultView });
});

export default router;
