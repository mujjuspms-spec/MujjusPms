import { useState } from 'react';
import { useToast } from '../../components/Toast';
import { updateWorkSchedule } from '../../services/workspaceSettings';
import { SectionCard, SaveButton } from './shared';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOLIDAY_CALENDARS = ['', 'Saudi Arabia', 'United Arab Emirates', 'United States', 'United Kingdom', 'India'];

export default function WorkSchedule({ data, setData, workspaceId }) {
  const { show } = useToast();
  const ws = data.settings.workSchedule;
  const [draft, setDraft] = useState(() => ({ ...ws, workingDays: new Set(ws.workingDays) }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function toggleDay(day) {
    setDraft((d) => {
      const next = new Set(d.workingDays);
      if (next.has(day)) next.delete(day); else next.add(day);
      return { ...d, workingDays: next };
    });
  }

  async function save() {
    if (saving) return;
    if (draft.workStart >= draft.workEnd) { setError('Working hours start must be before the end.'); return; }
    if (!Number.isInteger(draft.weeklyCapacity) || draft.weeklyCapacity <= 0) { setError('Weekly capacity must be a positive whole number.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await updateWorkSchedule(workspaceId, {
        workingDays: Array.from(draft.workingDays), workStart: draft.workStart, workEnd: draft.workEnd,
        weeklyCapacity: draft.weeklyCapacity, holidayCalendar: draft.holidayCalendar,
      });
      setData((d) => ({ ...d, settings: { ...d.settings, workSchedule: res.settings.workSchedule } }));
      show('Work schedule saved');
    } catch (e) {
      setError(e.message || 'Could not save your changes');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard title="Work Schedule" description="Workspace-wide defaults for working days, hours, and weekly capacity — used by Workload calculations.">
      <div className="field">
        <label>Working Days</label>
        <div className="col gap-6">
          {DAYS.map((d) => (
            <label key={d} className="flex items-center gap-8" style={{ fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" style={{ width: 'auto' }} checked={draft.workingDays.has(d)} onChange={() => toggleDay(d)} />
              {d}
            </label>
          ))}
        </div>
      </div>
      <div className="flex gap-12">
        <div className="field grow">
          <label>Default Working Hours — start</label>
          <input type="time" value={draft.workStart} onChange={(e) => setDraft((d) => ({ ...d, workStart: e.target.value }))} />
        </div>
        <div className="field grow">
          <label>Default Working Hours — end</label>
          <input type="time" value={draft.workEnd} onChange={(e) => setDraft((d) => ({ ...d, workEnd: e.target.value }))} />
        </div>
      </div>
      <div className="flex gap-12">
        <div className="field grow">
          <label>Default Weekly Capacity</label>
          <div className="flex items-center gap-8">
            <input type="number" min="1" style={{ width: 90 }} value={draft.weeklyCapacity} onChange={(e) => setDraft((d) => ({ ...d, weeklyCapacity: Number(e.target.value) }))} />
            <span style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>hours/week</span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 4 }}>Individuals can still set their own capacity from their Profile.</p>
        </div>
        <div className="field grow">
          <label>Public Holiday Calendar</label>
          <select value={draft.holidayCalendar} onChange={(e) => setDraft((d) => ({ ...d, holidayCalendar: e.target.value }))}>
            {HOLIDAY_CALENDARS.map((c) => <option key={c} value={c}>{c || 'Not set'}</option>)}
          </select>
        </div>
      </div>
      {error && <p style={{ fontSize: 12, color: 'var(--status-critical)', marginBottom: 8 }}>{error}</p>}
      <SaveButton saving={saving} onClick={save} />
    </SectionCard>
  );
}
