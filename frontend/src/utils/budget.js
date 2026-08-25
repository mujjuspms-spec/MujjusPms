// Single source of truth for budget status wording/color and project-level
// totals, mirroring backend/src/lib/budget.js exactly so the two can never
// disagree. The per-task rollup itself (effectiveBudget/effectiveSpent —
// "a task's own value wins if set, else sum of children") is computed once
// server-side and delivered on every task object; the frontend only needs
// to sum those already-computed fields, never re-derive the recursion.

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

export function budgetStatusColor(status) {
  if (status === BUDGET_STATUS.OVER) return 'var(--status-critical)';
  if (status === BUDGET_STATUS.UNDER) return 'var(--status-good)';
  if (status === BUDGET_STATUS.REACHED) return 'var(--brand-500)';
  return 'var(--ink-muted)';
}

export const BUDGET_SOURCE = { MANUAL: 'MANUAL', TASKS: 'TASKS' };

// Sums a project's TOP-LEVEL tasks' effective budget/spent — the same "own
// value wins if set, else sum of children" rule one level up: a project's
// manual `budget` (if set), when present, is authoritative and task
// budgets underneath it are read as an allocation breakdown, never added
// on top. Only when no manual budget is set does the total fall back to
// this task sum. Each top-level task's effectiveBudget/effectiveSpent
// already recursively includes its entire subtree (its own explicit
// number, or — if it has none of its own — the sum of its children), so
// summing anything below the top level would double-count. `manualBudget`
// <=0 is treated as unset (matches every pre-existing project's default of
// 0, from before this field could be cleared to null). Never produces
// NaN/Infinity: an empty or all-null project totals to a clean 0.
export function computeProjectBudgetTotals(topLevelTasks, manualBudget) {
  let taskTotal = 0;
  let spent = 0;
  for (const t of topLevelTasks) {
    taskTotal += t.effectiveBudget ?? t.budget ?? 0;
    spent += t.effectiveSpent ?? t.spent ?? 0;
  }
  const hasManualBudget = manualBudget != null && manualBudget > 0;
  const total = hasManualBudget ? manualBudget : taskTotal;
  const overallocatedBy = hasManualBudget && taskTotal > manualBudget ? taskTotal - manualBudget : 0;
  return {
    total, spent, remaining: total - spent,
    utilization: total > 0 ? Math.round((spent / total) * 1000) / 10 : 0,
    status: budgetStatusFor(total, spent),
    source: hasManualBudget ? BUDGET_SOURCE.MANUAL : BUDGET_SOURCE.TASKS,
    taskAllocated: taskTotal,
    unallocated: hasManualBudget ? total - taskTotal : 0,
    overallocated: overallocatedBy > 0,
    overallocatedBy,
  };
}

// Same shape, but across every project passed in (each already reduced to
// its own top-level tasks) — used for the portfolio-wide Budgets page and
// Dashboard cards.
export function computeAllProjectsBudgetTotals(projectTotalsList) {
  let total = 0;
  let spent = 0;
  for (const p of projectTotalsList) {
    total += p.total;
    spent += p.spent;
  }
  return {
    total, spent, remaining: total - spent,
    utilization: total > 0 ? Math.round((spent / total) * 1000) / 10 : 0,
    status: budgetStatusFor(total, spent),
  };
}
