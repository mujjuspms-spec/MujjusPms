import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from './Avatar';
import Icon from './Icon';
import HoverCard from './HoverCard';
import { HealthLabel, HEALTH_META } from './Pill';
import { useTasksStore } from '../hooks/useTasksStore';
import { person } from '../services/people';
import { parseDate } from '../utils/format';

const ZOOMS = {
  month: { label: 'Month', pxPerDay: 6, unit: 'month' },
  quarter: { label: 'Quarter', pxPerDay: 2.2, unit: 'quarter' },
  year: { label: 'Year', pxPerDay: 0.6, unit: 'year' },
};
const INFO_COL = 220;
const ROW_H = 60;
const DAY_MS = 86400000;

function daysBetween(a, b) { return (b.getTime() - a.getTime()) / DAY_MS; }

// Header bands for the chosen zoom unit — month labels at month zoom,
// quarter labels at quarter zoom, year labels at year zoom.
function headerUnits(min, max, unit) {
  const out = [];
  if (unit === 'year') {
    let y = min.getFullYear();
    while (y <= max.getFullYear()) {
      out.push({ start: new Date(y, 0, 1), end: new Date(y + 1, 0, 1), label: String(y) });
      y++;
    }
  } else if (unit === 'quarter') {
    let cur = new Date(min.getFullYear(), Math.floor(min.getMonth() / 3) * 3, 1);
    while (cur <= max) {
      const end = new Date(cur.getFullYear(), cur.getMonth() + 3, 1);
      out.push({ start: new Date(cur), end, label: `Q${Math.floor(cur.getMonth() / 3) + 1} '${String(cur.getFullYear()).slice(2)}` });
      cur = end;
    }
  } else {
    let cur = new Date(min.getFullYear(), min.getMonth(), 1);
    while (cur <= max) {
      const end = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      out.push({ start: new Date(cur), end, label: cur.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) });
      cur = end;
    }
  }
  return out;
}

function ProjectRowSkeleton() {
  return (
    <div className="flex" style={{ height: ROW_H, alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: INFO_COL, flex: `0 0 ${INFO_COL}px`, padding: '0 14px' }}>
        <div className="skel" style={{ width: '70%', height: 12, borderRadius: 4 }} />
      </div>
      <div style={{ flex: 1, padding: '0 10px' }}>
        <div className="skel" style={{ width: '45%', height: 20, borderRadius: 6 }} />
      </div>
    </div>
  );
}

// Portfolio-level schedule: "when are our projects happening?" — deliberately
// its own component (not GanttChart) so this can never drift back into being
// a second copy of the project-level Gantt view.
export default function PortfolioTimeline({ projects, loading }) {
  const navigate = useNavigate();
  const { tasksForProject } = useTasksStore();
  const [zoom, setZoom] = useState('month');

  const hasDates = (p) => p.start && p.start !== 'Unscheduled' && p.due && p.due !== 'Unscheduled';
  const scheduled = useMemo(() => projects
    .filter(hasDates)
    .map((p) => ({ project: p, start: parseDate(p.start), end: parseDate(p.due) })), [projects]);

  const { min, max, pxPerDay, units, totalW } = useMemo(() => {
    if (scheduled.length === 0) return { min: new Date(), max: new Date(), pxPerDay: ZOOMS[zoom].pxPerDay, units: [], totalW: 0 };
    const starts = scheduled.map((r) => r.start.getTime());
    const ends = scheduled.map((r) => r.end.getTime());
    const minD = new Date(Math.min(...starts));
    const maxD = new Date(Math.max(...ends));
    minD.setDate(1);
    maxD.setMonth(maxD.getMonth() + 1, 0);
    const u = headerUnits(minD, maxD, ZOOMS[zoom].unit);
    const w = Math.max(1, daysBetween(minD, u.length ? u[u.length - 1].end : maxD)) * ZOOMS[zoom].pxPerDay;
    return { min: minD, max: maxD, pxPerDay: ZOOMS[zoom].pxPerDay, units: u, totalW: w };
  }, [scheduled, zoom]);

  const offsetPx = (d) => daysBetween(min, d) * pxPerDay;
  const today = new Date();
  const todayPx = today >= min && today <= max ? offsetPx(today) : null;

  if (loading) {
    return <div className="card">{[1, 2, 3, 4].map((i) => <ProjectRowSkeleton key={i} />)}</div>;
  }

  if (scheduled.length === 0) {
    return (
      <div className="card card-pad" style={{ textAlign: 'center', color: 'var(--ink-muted)', fontSize: 13, padding: 40 }}>
        No projects have scheduling dates yet.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>Drag the horizontal scrollbar below to see more — zoom only changes with the controls, never the mouse wheel.</div>
        <div className="tabbar" style={{ marginBottom: 0 }}>
          {Object.entries(ZOOMS).map(([key, z]) => (
            <button key={key} className={zoom === key ? 'active' : ''} onClick={() => setZoom(key)}>{z.label}</button>
          ))}
        </div>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <div style={{ position: 'relative', width: INFO_COL + totalW }}>
          {/* header */}
          <div className="flex" style={{ borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: INFO_COL, flex: `0 0 ${INFO_COL}px`, position: 'sticky', left: 0, background: 'var(--surface-1)', zIndex: 3 }} />
            {units.map((u) => (
              <div
                key={u.start.toISOString()}
                style={{
                  width: daysBetween(u.start, u.end) * pxPerDay, flex: `0 0 ${daysBetween(u.start, u.end) * pxPerDay}px`,
                  fontSize: 11, fontWeight: 700, color: 'var(--ink-muted)', textAlign: 'center', padding: '10px 0',
                  borderInlineStart: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: '.04em', fontFamily: 'var(--font-mono)',
                }}
              >
                {u.label}
              </div>
            ))}
          </div>

          {todayPx !== null && (
            <div className="gantt-today" style={{ position: 'absolute', top: 0, bottom: 0, width: 2, left: INFO_COL + todayPx, zIndex: 2 }} title="Today" />
          )}

          {scheduled.map(({ project: p, start, end }) => {
            const owner = person(p.ownerId);
            const meta = HEALTH_META[p.health] || HEALTH_META.good;
            const milestones = [...tasksForProject(p.id)]
              .filter((t) => t.due && t.due !== 'Unscheduled')
              .sort((a, b) => parseDate(a.due) - parseDate(b.due))
              .slice(0, 4);
            const left = offsetPx(start);
            const width = Math.max(4, offsetPx(end) - left);
            return (
              <div key={p.id} className="flex" style={{ height: ROW_H, alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: INFO_COL, flex: `0 0 ${INFO_COL}px`, position: 'sticky', left: 0, background: 'var(--surface-1)', zIndex: 1, padding: '0 12px' }}>
                  <div className="flex items-center gap-8">
                    <Avatar person={owner} size={22} />
                    <span className="truncate" style={{ fontSize: 12.5, fontWeight: 700 }}>{p.name}</span>
                  </div>
                  <div style={{ marginTop: 3 }}><HealthLabel health={p.health} /></div>
                </div>
                <div style={{ position: 'relative', flex: `0 0 ${totalW}px`, height: '100%' }}>
                  <HoverCard
                    style={{ position: 'absolute', top: '50%', left, width, transform: 'translateY(-50%)', height: 24 }}
                    content={(
                      <div style={{ fontSize: 12 }}>
                        <div style={{ fontWeight: 700, marginBottom: 6 }}>{p.name}</div>
                        <div className="col gap-3" style={{ color: 'var(--ink-muted)' }}>
                          <span>Start: {p.start}</span>
                          <span>Target: {p.due}</span>
                          <span>Progress: {p.progress}%</span>
                          <span>Health: {meta.text}</span>
                          <span>Owner: {owner?.name}</span>
                        </div>
                      </div>
                    )}
                  >
                    <div
                      onClick={() => navigate(`/projects/${p.id}`)}
                      style={{
                        width: '100%', height: '100%', borderRadius: 6, background: meta.color, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: 11, fontWeight: 700, color: '#fff',
                        whiteSpace: 'nowrap', overflow: 'hidden',
                      }}
                    >
                      {p.progress}%
                    </div>
                  </HoverCard>
                  {milestones.map((m) => {
                    const mLeft = offsetPx(parseDate(m.due));
                    if (mLeft < 0 || mLeft > totalW) return null;
                    return (
                      <HoverCard
                        key={m.id}
                        style={{ position: 'absolute', top: '50%', left: mLeft - 5, transform: 'translateY(-50%)' }}
                        content={(
                          <div style={{ fontSize: 12 }}>
                            <div style={{ fontWeight: 700, marginBottom: 4 }}>{m.title}</div>
                            <div style={{ color: 'var(--ink-muted)' }}>{m.due} · {m.status}</div>
                          </div>
                        )}
                      >
                        <span
                          style={{
                            width: 10, height: 10, background: 'var(--ink-primary)', border: '2px solid var(--surface-1)',
                            transform: 'rotate(45deg)', display: 'block', cursor: 'pointer',
                          }}
                        />
                      </HoverCard>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
