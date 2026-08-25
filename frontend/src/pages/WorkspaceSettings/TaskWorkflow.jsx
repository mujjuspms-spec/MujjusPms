import { useState } from 'react';
import { useToast } from '../../components/Toast';
import { updateTaskDefaults } from '../../services/workspaceSettings';
import { SectionCard, SaveButton, ToggleRow } from './shared';

const STATUSES = ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

export default function TaskWorkflow({ data, setData, workspaceId }) {
  const { show } = useToast();
  const t = data.settings.tasks;
  const [draft, setDraft] = useState(() => ({ ...t }));
  const [saving, setSaving] = useState(false);

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const res = await updateTaskDefaults(workspaceId, draft);
      setData((d) => ({ ...d, settings: { ...d.settings, tasks: res.settings.tasks } }));
      show('Task & workflow settings saved');
    } catch (e) {
      show(e.message || 'Could not save your changes', 'critical');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard title="Tasks & Workflow">
      <div className="field">
        <label>Default Task Statuses</label>
        <div className="flex wrap gap-6">{STATUSES.map((s) => <span key={s} className="pill" style={{ padding: '2px 8px' }}>{s}</span>)}</div>
        <p style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 4 }}>These are the statuses already used across every board and list in the app.</p>
      </div>
      <div className="field">
        <label>Default Priority Levels</label>
        <div className="flex wrap gap-6">{PRIORITIES.map((p) => <span key={p} className="pill" style={{ padding: '2px 8px' }}>{p}</span>)}</div>
      </div>
      <div className="field">
        <label>Task ID Prefix (optional)</label>
        <input value={draft.taskIdPrefix} onChange={(e) => setDraft((d) => ({ ...d, taskIdPrefix: e.target.value.toUpperCase() }))} placeholder="e.g. TASK" style={{ width: 160 }} />
      </div>
      <div className="flex gap-12">
        <div className="field grow">
          <label>Default Assignee Behavior</label>
          <select value={draft.defaultAssigneeBehavior} onChange={(e) => setDraft((d) => ({ ...d, defaultAssigneeBehavior: e.target.value }))}>
            <option value="unassigned">Leave unassigned</option>
            <option value="creator">Assign to creator</option>
          </select>
        </div>
        <div className="field grow">
          <label>Completed Task Behavior</label>
          <select value={draft.completedTaskBehavior} onChange={(e) => setDraft((d) => ({ ...d, completedTaskBehavior: e.target.value }))}>
            <option value="keep">Keep in list</option>
            <option value="archive">Archive automatically</option>
          </select>
        </div>
      </div>
      <ToggleRow
        label="Allow Member Task Creation" hint="Members can create tasks in projects they're assigned to."
        checked={draft.allowMemberTaskCreation} onChange={(v) => setDraft((d) => ({ ...d, allowMemberTaskCreation: v }))}
      />
      <ToggleRow
        label="Allow Viewer Comments" hint="Viewers stay read-only for everything else, but can post comments if this is on."
        checked={draft.allowViewerComments} onChange={(v) => setDraft((d) => ({ ...d, allowViewerComments: v }))}
      />
      <div style={{ marginTop: 14 }}><SaveButton saving={saving} onClick={save} /></div>
    </SectionCard>
  );
}
