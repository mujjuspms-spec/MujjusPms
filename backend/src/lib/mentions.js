function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Matches literal "@Full Name" tokens against known users, longest name
// first so "Test Member" claims its full span before the shorter "Test"
// ever gets a chance to match the same "@Test" prefix as its own mention —
// a trailing word-boundary check alone isn't enough for that, since the
// space between "Test" and "Member" would otherwise look like a valid
// boundary for the shorter name too.
export function extractMentions(body, users) {
  const sorted = [...users].sort((a, b) => b.name.length - a.name.length);
  const claimed = []; // [start, end) character ranges already matched by a longer name
  const found = new Set();

  for (const u of sorted) {
    const pattern = new RegExp('@' + escapeRegExp(u.name) + '(?![a-zA-Z0-9])', 'gi');
    let match;
    while ((match = pattern.exec(body))) {
      const start = match.index;
      const end = start + match[0].length;
      const overlaps = claimed.some(([cs, ce]) => start < ce && end > cs);
      if (!overlaps) {
        found.add(u.id);
        claimed.push([start, end]);
      }
    }
  }
  return Array.from(found);
}
