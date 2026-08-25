// Shared numeric-money validation for both Task.budget/Task.spent and
// Project.budget — one place so "empty/null clears it, negative is
// rejected" behaves identically everywhere a money field is written.
export function parseMoney(raw, label) {
  if (raw === null || raw === undefined || raw === '') return { value: null, error: null };
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return { value: null, error: `${label} cannot be negative` };
  return { value: n, error: null };
}
