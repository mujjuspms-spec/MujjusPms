import { prisma } from './prisma.js';
import { notifyUser } from './notify.js';
import { logAudit } from './audit.js';

async function runActions(rule, task, text) {
  const actionConfig = JSON.parse(rule.actionConfigJson || '{}');
  const project = await prisma.project.findUnique({ where: { id: task.projectId } });

  if (rule.actionType === 'notify_owner' && project) {
    await notifyUser(project.ownerId, { text, projectId: task.projectId, taskId: task.id, icon: 'i-sparkle', color: 'var(--brand-500)' });
  } else if (rule.actionType === 'notify_assignee' && task.assigneeId) {
    await notifyUser(task.assigneeId, { text, projectId: task.projectId, taskId: task.id, icon: 'i-sparkle', color: 'var(--brand-500)' });
  } else if (rule.actionType === 'notify_user' && actionConfig.userId) {
    await notifyUser(actionConfig.userId, { text, projectId: task.projectId, taskId: task.id, icon: 'i-sparkle', color: 'var(--brand-500)' });
  } else if (rule.actionType === 'set_priority' && actionConfig.priority) {
    await prisma.task.update({ where: { id: task.id }, data: { priority: actionConfig.priority } });
  }

  await logAudit('automation:' + rule.id, 'automation_fired', 'task', task.id, { ruleId: rule.id, rule: rule.name }, project?.workspaceId);
}

// Evaluates automation rules against a task field change and runs any
// matching actions. Call after persisting the task mutation. `task` is a
// raw Prisma task row (projectId/assigneeId, not the serialized API shape).
export async function runAutomations(task, change) {
  const rules = await prisma.automationRule.findMany({
    where: { enabled: true, OR: [{ projectId: null }, { projectId: task.projectId }] },
  });

  for (const rule of rules) {
    if (rule.triggerType === 'status_change' && change.field === 'status') {
      const triggerConfig = JSON.parse(rule.triggerConfigJson || '{}');
      if (triggerConfig.to && triggerConfig.to !== change.to) continue;
      await runActions(rule, task, `Automation "${rule.name}" fired on "${task.title}"`);
    } else if (rule.triggerType === 'budget_threshold' && (change.field === 'spent' || change.field === 'budget')) {
      if (task.budget == null || !task.spent) continue;
      const triggerConfig = JSON.parse(rule.triggerConfigJson || '{}');
      const pct = (task.spent / task.budget) * 100;
      if (pct < (triggerConfig.percent || 100)) continue;
      await runActions(rule, task, `Automation "${rule.name}" fired — "${task.title}" is at ${Math.round(pct)}% of budget`);
    }
  }
}

// Polled once a day (see server.js) rather than event-driven, since
// "due in N days" isn't triggered by any single mutation — it becomes true
// purely from time passing. Fires at most once per task per rule per day
// (checked via a matching AuditLog row already written today).
export async function runDueDateAutomations() {
  const rules = await prisma.automationRule.findMany({ where: { enabled: true, triggerType: 'due_date_approaching' } });
  if (rules.length === 0) return;

  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);

  for (const rule of rules) {
    const triggerConfig = JSON.parse(rule.triggerConfigJson || '{}');
    const daysBefore = triggerConfig.daysBefore ?? 3;
    const tasks = await prisma.task.findMany({
      where: { status: { not: 'done' }, ...(rule.projectId ? { projectId: rule.projectId } : {}) },
    });

    for (const task of tasks) {
      const due = new Date(task.due);
      if (isNaN(due)) continue;
      const daysLeft = Math.ceil((due - Date.now()) / 86400000);
      if (daysLeft < 0 || daysLeft > daysBefore) continue;

      const already = await prisma.auditLog.findFirst({
        where: { action: 'automation_fired', entityType: 'task', entityId: task.id, createdAt: { gte: startOfToday }, detailJson: { contains: rule.id } },
      });
      if (already) continue;

      await runActions(rule, task, `Automation "${rule.name}" fired — "${task.title}" is due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`);
    }
  }
}
