import { useState } from 'react';
import { useToast } from '../../components/Toast';
import { updateTimesheetSettings } from '../../services/workspaceSettings';
import { SectionCard, SaveButton, ToggleRow } from './shared';

export default function TimesheetSettings({ data, setData, workspaceId }) {
  const { show } = useToast();
  const ts = data.settings.timesheets;
  const [draft, setDraft] = useState(() => ({ ...ts }));
  const [saving, setSaving] = useState(false);

  function set(key, val) {
    setDraft((d) => ({ ...d, [key]: val }));
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const res = await updateTimesheetSettings(workspaceId, draft);
      setData((d) => ({ ...d, settings: { ...d.settings, timesheets: res.settings.timesheets } }));
      show('Timesheet settings saved');
    } catch (e) {
      show(e.message || 'Could not save your changes', 'critical');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <SectionCard title="Timesheets" description="Time-tracking rules enforced for everyone in this workspace.">
        <ToggleRow label="Enable Time Tracking" checked={draft.timeTrackingEnabled} onChange={(v) => set('timeTrackingEnabled', v)} />
        <ToggleRow label="Require Project Selection" checked disabled hint="Every time entry already requires a project — this can't be turned off." onChange={() => {}} />
        <ToggleRow label="Require Task Selection" checked={draft.requireTaskSelection} onChange={(v) => set('requireTaskSelection', v)} />
        <ToggleRow label="Allow Manual Time Entry" checked={draft.allowManualEntry} onChange={(v) => set('allowManualEntry', v)} />
        <ToggleRow label="Allow Timer" checked={draft.allowTimer} onChange={(v) => set('allowTimer', v)} />
        <ToggleRow label="Require Notes" checked={draft.requireNotes} onChange={(v) => set('requireNotes', v)} />
        <ToggleRow label="Allow Future Entries" checked={draft.allowFutureEntries} onChange={(v) => set('allowFutureEntries', v)} />
        <ToggleRow label="Allow Backdated Entries" checked={draft.allowBackdatedEntries} onChange={(v) => set('allowBackdatedEntries', v)} />
        <div className="field" style={{ marginTop: 10 }}>
          <label>Timesheet Week Start</label>
          <select value={draft.timesheetWeekStart} onChange={(e) => set('timesheetWeekStart', e.target.value)} style={{ width: 200 }}>
            <option value="Sunday">Sunday</option>
            <option value="Monday">Monday</option>
            <option value="Saturday">Saturday</option>
          </select>
        </div>
        <div style={{ marginTop: 14 }}><SaveButton saving={saving} onClick={save} /></div>
      </SectionCard>

      <SectionCard title="Admin timesheet permissions">
        <div className="flex items-center justify-between" style={{ padding: '6px 0' }}>
          <span style={{ fontSize: 13 }}>Admin access</span>
          <span className="pill pill-done" style={{ padding: '2px 8px' }}>View all timesheets — read only</span>
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 6 }}>
          Admins can view every logged time entry in the workspace, but cannot edit or delete another person's entries — only the entry's own author can, unless a future approval feature is added.
        </p>
      </SectionCard>
    </>
  );
}
