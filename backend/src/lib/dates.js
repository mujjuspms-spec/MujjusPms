// Start/due are stored as free-form display strings (e.g. "01 Dec 2026"),
// with "Unscheduled" (or empty/null) meaning "no date set" — never a real
// date to compare against. Only reject when BOTH sides are actual,
// parseable dates and due falls before start.
export function isDueBeforeStart(start, due) {
  if (!start || !due || start === 'Unscheduled' || due === 'Unscheduled') return false;
  const s = new Date(start);
  const d = new Date(due);
  if (Number.isNaN(s.getTime()) || Number.isNaN(d.getTime())) return false;
  return d < s;
}
