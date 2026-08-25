// The whole workspace runs in a single currency — USD — so this always
// renders a $ figure regardless of what's passed in.
export function money(amount) {
  if (amount == null || Number.isNaN(amount)) return '—';
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  if (abs >= 1000000) return `${sign}$${(abs / 1000000).toFixed(abs % 1000000 === 0 ? 0 : 1)}M`;
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(0)}K`;
  return `${sign}$${abs.toLocaleString('en-US')}`;
}

// Full precision, comma-grouped USD — used for tooltips and edit contexts
// where the abbreviated $4.2M form would be ambiguous.
export function moneyFull(amount) {
  if (amount == null || Number.isNaN(amount)) return 'Not set';
  return `$${Number(amount).toLocaleString('en-US')} USD`;
}

export function initialsOf(name) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

export function parseDate(str) {
  const d = new Date(str);
  return isNaN(d) ? new Date() : d;
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Converts a native <input type="date"> value ("2027-06-30") into this
// app's display format ("30 Jun 2027"), matching every other date shown.
export function formatDateInput(isoDateStr) {
  if (!isoDateStr) return '';
  const [y, m, d] = isoDateStr.split('-').map(Number);
  if (!y || !m || !d) return '';
  return `${String(d).padStart(2, '0')} ${MONTHS_SHORT[m - 1]} ${y}`;
}

// The reverse of formatDateInput — turns this app's display format
// ("30 Jun 2027") back into a native <input type="date"> value
// ("2027-06-30") so an existing date can be pre-filled for editing.
export function toDateInputValue(displayStr) {
  if (!displayStr || displayStr === 'Unscheduled') return '';
  const d = parseDate(displayStr);
  if (isNaN(d)) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Minutes -> "30m" (under an hour), "8h" (whole), "2.5h" (fractional, one
// decimal, trailing zero trimmed). Mirrors money()'s "always render
// something readable" contract — never shows raw minute counts.
export function formatMinutes(minutes) {
  if (minutes == null || Number.isNaN(minutes)) return 'Not set';
  const abs = Math.abs(minutes);
  const sign = minutes < 0 ? '-' : '';
  if (abs < 60) return `${sign}${abs}m`;
  const hours = abs / 60;
  const rounded = Math.round(hours * 10) / 10;
  const label = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${sign}${label}h`;
}

// remainingMinutes < 0 means logged time has exceeded the estimate — shown
// as "Over by Xh" rather than a confusing negative duration.
export function remainingLabel(remainingMinutes) {
  if (remainingMinutes == null) return null;
  if (remainingMinutes < 0) return `Over by ${formatMinutes(-remainingMinutes)}`;
  return formatMinutes(remainingMinutes);
}

export const STATUS_ORDER = ['backlog', 'todo', 'progress', 'review', 'done'];
// The full 6-value column set (STATUS_ORDER above deliberately excludes
// 'blocked' for progress-distribution charts) — the one canonical list of
// every task status, for anything that needs all of them (Kanban columns,
// the task panel's status picker, automation triggers).
export const TASK_STATUSES = ['backlog', 'todo', 'progress', 'review', 'done', 'blocked'];
export const STATUS_LABEL_KEY = {
  backlog: 'status.backlog', todo: 'status.todo', progress: 'status.progress',
  review: 'status.review', done: 'status.done', blocked: 'status.blocked',
};
