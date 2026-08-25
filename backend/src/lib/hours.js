import { prisma } from './prisma.js';

// One aggregate query for however many task ids are in scope — never N+1.
export async function loggedMinutesByTask(taskIds) {
  if (taskIds.length === 0) return new Map();
  const rows = await prisma.timesheetEntry.groupBy({
    by: ['taskId'], _sum: { hours: true }, where: { taskId: { in: taskIds } },
  });
  return new Map(rows.filter((r) => r.taskId).map((r) => [r.taskId, Math.round((r._sum.hours || 0) * 60)]));
}

// Bottom-up rollup: a SUM_OF_SUBTASKS task's effective estimate is the sum of
// its children's OWN effective estimates (recursing through arbitrary
// depth), so a multi-level tree never double-counts. A MANUAL task (or one
// with no children) just reports its own estimatedMinutes.
export function effectiveEstimatedMinutes(task, childrenByParentId, memo = new Map()) {
  if (memo.has(task.id)) return memo.get(task.id);
  const children = childrenByParentId.get(task.id) || [];
  if (task.hourCalculationMode === 'SUM_OF_SUBTASKS' && children.length > 0) {
    let sum = null;
    for (const child of children) {
      const childEst = effectiveEstimatedMinutes(child, childrenByParentId, memo);
      if (childEst != null) sum = (sum || 0) + childEst;
    }
    memo.set(task.id, sum);
    return sum;
  }
  memo.set(task.id, task.estimatedMinutes ?? null);
  return task.estimatedMinutes ?? null;
}

export function hoursOut(task, loggedMinutes, effectiveEstimated) {
  const logged = loggedMinutes ?? 0;
  return {
    estimatedMinutes: task.estimatedMinutes ?? null,
    effectiveEstimatedMinutes: effectiveEstimated ?? null,
    hourCalculationMode: task.hourCalculationMode,
    loggedMinutes: logged,
    remainingMinutes: effectiveEstimated != null ? effectiveEstimated - logged : null,
  };
}

// Builds a parentId -> children[] map, computes effective-estimate + logged
// minutes for every task in `tasks`, and returns a Map<taskId, hoursOut(...)>
// ready to merge into each task's serialized output. Used by any route that
// returns a set of tasks it already has fully loaded (bulk list, one
// project, or one task's subtree).
export async function computeHoursForTasks(tasks) {
  const childrenByParentId = new Map();
  for (const t of tasks) {
    if (!t.parentId) continue;
    if (!childrenByParentId.has(t.parentId)) childrenByParentId.set(t.parentId, []);
    childrenByParentId.get(t.parentId).push(t);
  }
  const logged = await loggedMinutesByTask(tasks.map((t) => t.id));
  const memo = new Map();
  const out = new Map();
  for (const t of tasks) {
    const effective = effectiveEstimatedMinutes(t, childrenByParentId, memo);
    out.set(t.id, hoursOut(t, logged.get(t.id), effective));
  }
  return out;
}
