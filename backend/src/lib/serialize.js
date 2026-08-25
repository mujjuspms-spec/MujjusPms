import { budgetOut, budgetStatusFor, computeProjectBudgetTotals, BUDGET_SOURCE } from './budget.js';

// `hours` (optional): { estimatedMinutes, effectiveEstimatedMinutes,
// hourCalculationMode, loggedMinutes, remainingMinutes } from
// lib/hours.js's computeHoursForTasks — merged in by every route that
// returns tasks. Falls back to the task's own raw fields if omitted so this
// stays a non-breaking signature change.
// `budget` (optional): budgetOut(...) from lib/budget.js's
// computeBudgetForTasks — same merge pattern, same fallback-to-raw-fields
// behavior when omitted.
export function taskOut(t, hours, budget) {
  return {
    id: t.id, project: t.projectId, parentId: t.parentId, title: t.title, status: t.status,
    priority: t.priority, assignee: t.assigneeId, start: t.start, due: t.due, progress: t.progress, desc: t.desc,
    budget: t.budget ?? null, spent: t.spent ?? null, order: t.order,
    dependsOn: JSON.parse(t.dependsOnJson || '[]'), createdAt: t.createdAt,
    recurrence: t.recurrenceJson ? JSON.parse(t.recurrenceJson) : null, sprintId: t.sprintId ?? null,
    estimatedMinutes: hours ? hours.estimatedMinutes : (t.estimatedMinutes ?? null),
    effectiveEstimatedMinutes: hours ? hours.effectiveEstimatedMinutes : (t.estimatedMinutes ?? null),
    hourCalculationMode: hours ? hours.hourCalculationMode : (t.hourCalculationMode ?? 'MANUAL'),
    loggedMinutes: hours ? hours.loggedMinutes : 0,
    remainingMinutes: hours ? hours.remainingMinutes : null,
    effectiveBudget: budget ? budget.effectiveBudget : (t.budget ?? null),
    effectiveSpent: budget ? budget.effectiveSpent : (t.spent ?? 0),
    remainingBudget: budget ? budget.remainingBudget : (t.budget != null ? t.budget - (t.spent ?? 0) : null),
    budgetUtilization: budget ? budget.budgetUtilization : (t.budget ? Math.round(((t.spent ?? 0) / t.budget) * 1000) / 10 : 0),
    budgetStatus: budget ? budget.budgetStatus : budgetStatusFor(t.budget, t.spent),
  };
}

// myRole (optional): the calling user's computed role on this project —
// 'admin' | 'member' | 'viewer' | null — attached so the frontend never
// needs a second round-trip to know what it can do here.
// `budgetTotals` (optional): computeProjectBudgetTotals(projectTasks) from
// lib/budget.js — the project's budget rolled up from its own tasks/
// subtasks, summed only over top-level tasks so nothing double-counts.
// Falls back to the project's raw stored budget/spent columns when omitted
// (a route that hasn't loaded this project's tasks) so this stays
// non-breaking.
export function projectOut(p, myRole, budgetTotals) {
  const { integrationsJson, ...rest } = p;
  const hasManualBudget = p.budget != null && p.budget > 0;
  const fallbackTotal = hasManualBudget ? p.budget : (p.spent ?? 0);
  const totals = budgetTotals || {
    total: fallbackTotal, spent: p.spent ?? 0, remaining: fallbackTotal - (p.spent ?? 0),
    utilization: fallbackTotal > 0 ? Math.round(((p.spent ?? 0) / fallbackTotal) * 1000) / 10 : 0,
    status: budgetStatusFor(fallbackTotal, p.spent),
    source: hasManualBudget ? BUDGET_SOURCE.MANUAL : BUDGET_SOURCE.TASKS,
    taskAllocated: 0, unallocated: 0, overallocated: false, overallocatedBy: 0,
  };
  return {
    ...rest, integrations: JSON.parse(integrationsJson || '[]'), myRole: myRole ?? null,
    budgetTotal: totals.total, spentTotal: totals.spent, remainingBudget: totals.remaining,
    budgetUtilization: totals.utilization, budgetStatus: totals.status, budgetSource: totals.source,
    taskAllocatedBudget: totals.taskAllocated, unallocatedBudget: totals.unallocated,
    budgetOverallocated: totals.overallocated, budgetOverallocatedBy: totals.overallocatedBy,
  };
}

export function ruleOut(r) {
  return {
    id: r.id, projectId: r.projectId, name: r.name, triggerType: r.triggerType,
    triggerConfig: JSON.parse(r.triggerConfigJson || '{}'), actionType: r.actionType,
    actionConfig: JSON.parse(r.actionConfigJson || '{}'), enabled: r.enabled,
  };
}

export function auditOut(a) {
  return { id: a.id, actorId: a.actorId, action: a.action, entityType: a.entityType, entityId: a.entityId, detail: JSON.parse(a.detailJson || '{}'), createdAt: a.createdAt };
}

export function integrationOut(row) {
  const cfg = JSON.parse(row.configJson || '{}');
  return { connected: row.connected, ...cfg };
}

export function timesheetOut(row) {
  return {
    id: row.id, projectId: row.projectId, taskId: row.taskId, userId: row.userId,
    date: row.date, hours: row.hours, note: row.note, createdAt: row.createdAt,
  };
}

export function issueOut(i) {
  return {
    id: i.id, project: i.projectId, title: i.title, description: i.description, severity: i.severity,
    status: i.status, environment: i.environment, reporterId: i.reporterId, assigneeId: i.assigneeId,
    createdAt: i.createdAt, resolvedAt: i.resolvedAt,
  };
}

export function customFieldDefOut(f) {
  return { id: f.id, project: f.projectId, name: f.name, type: f.type, options: JSON.parse(f.optionsJson || '[]'), order: f.order };
}

export function sprintOut(s) {
  return { id: s.id, project: s.projectId, name: s.name, startDate: s.startDate, endDate: s.endDate, goal: s.goal, createdAt: s.createdAt };
}

export function approvalOut(a) {
  return { id: a.id, taskId: a.taskId, requestedById: a.requestedById, approverId: a.approverId, status: a.status, note: a.note, groupId: a.groupId, sequence: a.sequence, createdAt: a.createdAt, decidedAt: a.decidedAt };
}

export function chatMessageOut(m) {
  return { id: m.id, project: m.projectId, authorId: m.authorId, body: m.body, createdAt: m.createdAt };
}

export function goalOut(g) {
  return { id: g.id, project: g.projectId, ownerId: g.ownerId, quarter: g.quarter, title: g.title, progress: g.progress, createdAt: g.createdAt };
}

export function customTemplateOut(row) {
  return {
    key: row.id, name: row.name, category: row.category, description: row.description,
    phases: JSON.parse(row.phasesJson || '[]'), custom: true, createdById: row.createdById, createdAt: row.createdAt,
  };
}
