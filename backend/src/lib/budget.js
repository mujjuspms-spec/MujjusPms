// Mirrors hours.js's rollup shape, but budget/spent have no explicit
// "calculation mode" field the way estimatedMinutes has hourCalculationMode.
// Instead: a task's own budget/spent, if explicitly set, is always
// authoritative (the "Manual" case — children are allocations *from* it,
// never added on top). Only when a task has NO value of its own does it
// roll up as the sum of its children's effective values (the "calculated"
// case). This needs no new field, can't double-count, and falls out of the
// existing nullable Task.budget/Task.spent columns as-is.

export const BUDGET_STATUS = {
  NONE: 'No budget set',
  UNDER: 'Under budget',
  REACHED: 'Budget reached',
  OVER: 'Over budget',
};

export function budgetStatusFor(budget, spent) {
  if (budget == null || budget <= 0) return BUDGET_STATUS.NONE;
  const s = spent ?? 0;
  if (s > budget) return BUDGET_STATUS.OVER;
  if (s < budget) return BUDGET_STATUS.UNDER;
  return BUDGET_STATUS.REACHED;
}

function effectiveField(task, childrenByParentId, memoKey, memo, ownValue) {
  const cacheKey = `${memoKey}:${task.id}`;
  if (memo.has(cacheKey)) return memo.get(cacheKey);
  if (ownValue != null) {
    memo.set(cacheKey, ownValue);
    return ownValue;
  }
  const children = childrenByParentId.get(task.id) || [];
  if (children.length === 0) {
    memo.set(cacheKey, null);
    return null;
  }
  let sum = null;
  for (const child of children) {
    const childOwn = memoKey === 'budget' ? child.budget ?? null : child.spent ?? null;
    const childEffective = effectiveField(child, childrenByParentId, memoKey, memo, childOwn);
    if (childEffective != null) sum = (sum || 0) + childEffective;
  }
  memo.set(cacheKey, sum);
  return sum;
}

export function effectiveBudget(task, childrenByParentId, memo = new Map()) {
  return effectiveField(task, childrenByParentId, 'budget', memo, task.budget ?? null);
}

export function effectiveSpent(task, childrenByParentId, memo = new Map()) {
  return effectiveField(task, childrenByParentId, 'spent', memo, task.spent ?? null);
}

export function budgetOut(task, effBudget, effSpent) {
  const spent = effSpent ?? 0;
  return {
    budget: task.budget ?? null,
    spent: task.spent ?? null,
    effectiveBudget: effBudget ?? null,
    effectiveSpent: spent,
    remainingBudget: effBudget != null ? effBudget - spent : null,
    budgetUtilization: effBudget ? Math.round((spent / effBudget) * 1000) / 10 : 0,
    budgetStatus: budgetStatusFor(effBudget, spent),
  };
}

// Builds a parentId -> children[] map and computes effective budget/spent
// for every task in `tasks`. Returns a Map<taskId, budgetOut(...)> ready to
// merge into each task's serialized output — same shape/usage as
// computeHoursForTasks.
export function computeBudgetForTasks(tasks) {
  const childrenByParentId = new Map();
  for (const t of tasks) {
    if (!t.parentId) continue;
    if (!childrenByParentId.has(t.parentId)) childrenByParentId.set(t.parentId, []);
    childrenByParentId.get(t.parentId).push(t);
  }
  const memo = new Map();
  const out = new Map();
  for (const t of tasks) {
    const effBudget = effectiveBudget(t, childrenByParentId, memo);
    const effSpent = effectiveSpent(t, childrenByParentId, memo);
    out.set(t.id, budgetOut(t, effBudget, effSpent));
  }
  return out;
}

export const BUDGET_SOURCE = { MANUAL: 'MANUAL', TASKS: 'TASKS' };

// Project-level total — the same "own value wins if set, else sum of
// children" rule one level up: a project's manual budget (if set), when
// present, is authoritative and task budgets underneath it are read as an
// allocation breakdown, never added on top. Only when no manual budget is
// set does the total fall back to summing top-level tasks' effective
// budget/spent (each already recursively includes its own subtree, so
// summing anything below the top level would double-count).
//
// `manualBudget` is the project's raw stored budget column — treat <= 0
// the same as unset, matching every pre-existing project's default value
// of 0 (from before this field could be null) without needing a backfill.
export function computeProjectBudgetTotals(tasks, manualBudget) {
  const byId = computeBudgetForTasks(tasks);
  let taskTotal = null;
  let spent = null;
  for (const t of tasks) {
    if (t.parentId) continue;
    const b = byId.get(t.id);
    if (b.effectiveBudget != null) taskTotal = (taskTotal ?? 0) + b.effectiveBudget;
    if (b.effectiveSpent != null) spent = (spent ?? 0) + b.effectiveSpent;
  }
  const taskAllocated = taskTotal ?? 0;
  const totalSpent = spent ?? 0;
  const hasManualBudget = manualBudget != null && manualBudget > 0;
  const totalBudget = hasManualBudget ? manualBudget : taskAllocated;
  const overallocatedBy = hasManualBudget && taskAllocated > manualBudget ? taskAllocated - manualBudget : 0;

  return {
    total: totalBudget,
    spent: totalSpent,
    remaining: totalBudget - totalSpent,
    utilization: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 1000) / 10 : 0,
    status: budgetStatusFor(totalBudget, totalSpent),
    source: hasManualBudget ? BUDGET_SOURCE.MANUAL : BUDGET_SOURCE.TASKS,
    taskAllocated,
    unallocated: hasManualBudget ? totalBudget - taskAllocated : 0,
    overallocated: overallocatedBy > 0,
    overallocatedBy,
  };
}
