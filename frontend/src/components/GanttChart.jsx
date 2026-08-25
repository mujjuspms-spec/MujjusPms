import { useMemo } from 'react';
import Icon from './Icon';
import Avatar from './Avatar';
import HoverCard from './HoverCard';
import { person } from '../services/people';

const ROW_H = 46;

function monthsBetween(start, end) {
  const out = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cur <= last) {
    out.push(new Date(cur));
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}

// Project-level schedule: "when and in what sequence are the tasks
// happening?" — task hierarchy (rows carry `depth`/`hasChildren`), real
// dependency lines, and milestone diamonds, distinct from the portfolio-level
// PortfolioTimeline component (which never reuses this file).
export default function GanttChart({ rows, milestones = [], onToggleCollapse, onRowClick, today = new Date() }) {
  const { min, max, months } = useMemo(() => {
    const starts = rows.map((r) => r.start.getTime());
    const ends = rows.map((r) => r.end.getTime());
    const minD = new Date(Math.min(...starts));
    const maxD = new Date(Math.max(...ends));
    minD.setDate(1);
    maxD.setMonth(maxD.getMonth() + 1, 0);
    return { min: minD, max: maxD, months: monthsBetween(minD, maxD) };
  }, [rows]);

  const totalSpan = max.getTime() - min.getTime();
  const pct = (d) => ((d.getTime() - min.getTime()) / totalSpan) * 100;
  const todayPct = today >= min && today <= max ? pct(today) : null;
  const hasCritical = rows.some((r) => r.critical);
  const rowIndex = new Map(rows.map((r, i) => [r.id, i]));

  const edges = [];
  rows.forEach((r, i) => {
    (r.dependsOn || []).forEach((depId) => {
      const j = rowIndex.get(depId);
      if (j == null) return; // dependency isn't currently visible (collapsed / different depth)
      const dep = rows[j];
      edges.push({
        x1: pct(dep.end), y1: j * ROW_H + ROW_H / 2,
        x2: pct(r.start), y2: i * ROW_H + ROW_H / 2,
      });
    });
  });

  return (
    <div>
      {hasCritical && (
        <div className="flex items-center gap-6" style={{ fontSize: 11, color: 'var(--status-critical)', fontWeight: 700, marginBottom: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, border: '2px solid var(--status-critical)', display: 'inline-block' }} /> Critical path — any slip here delays the whole project
        </div>
      )}
      <div className="gantt-months">
        <div className="gantt-corner" />
        {months.map((m) => (
          <span key={m.toISOString()}>{m.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}</span>
        ))}
      </div>
      <div style={{ position: 'relative' }}>
        {todayPct !== null && <div className="gantt-today" style={{ left: `calc(230px + ${todayPct}% * (100% - 230px) / 100)` }} title="Today" />}

        {milestones.length > 0 && (
          <div style={{ position: 'absolute', top: 0, left: 230, right: 0, height: '100%', pointerEvents: 'none' }}>
            {milestones.filter((m) => m.due >= min && m.due <= max).map((m) => (
              <HoverCard
                key={m.id}
                style={{ position: 'absolute', top: -4, left: `${pct(m.due)}%`, pointerEvents: 'auto' }}
                content={<div style={{ fontSize: 12 }}><div style={{ fontWeight: 700, marginBottom: 4 }}>{m.title}</div><div style={{ color: 'var(--ink-muted)' }}>{m.dueLabel} · {m.status}</div></div>}
              >
                <span style={{ width: 10, height: 10, background: 'var(--brand-500)', border: '2px solid var(--surface-1)', transform: 'translateX(-5px) rotate(45deg)', display: 'block', boxShadow: 'var(--shadow-sm)' }} />
              </HoverCard>
            ))}
          </div>
        )}

        {edges.length > 0 && (
          <svg
            viewBox={`0 0 100 ${rows.length * ROW_H}`} preserveAspectRatio="none"
            style={{ position: 'absolute', top: 0, left: 230, right: 0, width: 'calc(100% - 230px)', height: rows.length * ROW_H, pointerEvents: 'none' }}
          >
            <defs>
              <marker id="gantt-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="var(--ink-muted)" />
              </marker>
            </defs>
            {edges.map((e, i) => (
              <path
                key={i}
                d={`M ${e.x1} ${e.y1} C ${(e.x1 + e.x2) / 2} ${e.y1}, ${(e.x1 + e.x2) / 2} ${e.y2}, ${e.x2} ${e.y2}`}
                fill="none" stroke="var(--ink-muted)" strokeWidth="0.3" strokeDasharray="1.2 1" markerEnd="url(#gantt-arrow)" vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
        )}

        {rows.map((r) => {
          const owner = person(r.ownerId);
          return (
            <div key={r.id} className="gantt-row" onClick={() => onRowClick?.(r.id)} style={{ cursor: onRowClick ? 'pointer' : 'default' }}>
              <div className="gantt-label truncate flex items-center gap-6" style={{ paddingInlineStart: (r.depth || 0) * 16 }}>
                {r.hasChildren ? (
                  <button
                    className="btn-icon" style={{ width: 18, height: 18, flex: '0 0 auto' }}
                    onClick={(e) => { e.stopPropagation(); onToggleCollapse?.(r.id); }}
                    aria-label={r.collapsed ? 'Expand' : 'Collapse'}
                  >
                    <Icon name={r.collapsed ? 'i-chevron-end' : 'i-chevron-down'} className="icon icon-sm" />
                  </button>
                ) : <span style={{ width: 18, flex: '0 0 auto' }} />}
                {r.critical && <Icon name="i-alert-t" className="icon icon-sm" style={{ color: 'var(--status-critical)', flex: '0 0 auto' }} />}
                {r.dependsOnLabels?.length > 0 && (
                  <span title={`Depends on: ${r.dependsOnLabels.join(', ')}`}><Icon name="i-link" className="icon icon-sm" style={{ color: 'var(--ink-muted)', flex: '0 0 auto' }} /></span>
                )}
                <span className="truncate">{r.label}</span>
                {owner && <Avatar person={owner} size={18} />}
              </div>
              <div className="gantt-track">
                <div
                  className="gantt-bar"
                  style={{
                    left: pct(r.start) + '%', width: Math.max(2, pct(r.end) - pct(r.start)) + '%',
                    background: r.color || 'var(--brand-500)',
                    outline: r.critical ? '2px solid var(--status-critical)' : 'none', outlineOffset: 1,
                  }}
                  title={`${r.label}: ${r.progress ?? 0}%`}
                >
                  {r.progress != null ? `${r.progress}%` : ''}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
