import { useMemo, useState } from 'react';
import Icon from '../components/Icon';
import TaskPanel from '../components/TaskPanel';
import { useI18n } from '../hooks/useI18n';
import { useTasksStore } from '../hooks/useTasksStore';
import { PROJECTS } from '../services/projects';
import { parseDate } from '../utils/format';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PROJECT_COLOR = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)', 'var(--cat-6)', 'var(--cat-7)', 'var(--cat-8)'];
const TODAY = new Date('2026-08-14');

export default function CalendarPage() {
  const { t } = useI18n();
  const { tasks } = useTasksStore();
  const [monthDate, setMonthDate] = useState(new Date(2026, 7, 1));
  const [openTaskId, setOpenTaskId] = useState(null);

  const colorOf = (pid) => PROJECT_COLOR[PROJECTS.findIndex((p) => p.id === pid) % PROJECT_COLOR.length];

  const cells = useMemo(() => {
    const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const start = new Date(first);
    start.setDate(start.getDate() - first.getDay());
    const out = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      out.push(d);
    }
    return out;
  }, [monthDate]);

  const tasksByDay = useMemo(() => {
    const map = {};
    tasks.forEach((tk) => {
      const d = parseDate(tk.due);
      const key = d.toDateString();
      (map[key] ||= []).push(tk);
    });
    return map;
  }, [tasks]);

  return (
    <section className="view">
      <div className="view-header">
        <div>
          <div className="view-title">{t('nav.calendar')}</div>
          <div className="view-subtitle">Task due dates across the portfolio.</div>
        </div>
        <div className="flex items-center gap-8">
          <button className="btn-icon" onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))}><Icon name="i-chevron-start" className="icon icon-sm" /></button>
          <div style={{ fontWeight: 700, fontSize: 13.5, minWidth: 130, textAlign: 'center' }}>{monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
          <button className="btn-icon" onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))}><Icon name="i-chevron-end" className="icon icon-sm" /></button>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
          {WEEKDAYS.map((w) => <div key={w} className="cal-wd">{w}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
          {cells.map((d) => {
            const inMonth = d.getMonth() === monthDate.getMonth();
            const isWeekend = d.getDay() === 5 || d.getDay() === 6;
            const isToday = d.toDateString() === TODAY.toDateString();
            const events = tasksByDay[d.toDateString()] || [];
            return (
              <div key={d.toISOString()} className={`cal-cell${isWeekend ? ' weekend' : ''}${!inMonth ? ' other-month' : ''}${isToday ? ' today' : ''}`}>
                <span className="cal-daynum">{d.getDate()}</span>
                {events.slice(0, 3).map((ev) => (
                  <div
                    key={ev.id}
                    className="cal-event"
                    style={{ background: `color-mix(in srgb, ${colorOf(ev.project)} 16%, transparent)`, color: colorOf(ev.project), cursor: 'pointer' }}
                    onClick={() => setOpenTaskId(ev.id)}
                  >
                    {ev.title}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      {openTaskId && <TaskPanel taskId={openTaskId} onClose={() => setOpenTaskId(null)} />}
    </section>
  );
}
