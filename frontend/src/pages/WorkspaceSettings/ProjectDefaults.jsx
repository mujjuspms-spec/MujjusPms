import { useState } from 'react';
import { useToast } from '../../components/Toast';
import { updateProjectDefaults } from '../../services/workspaceSettings';
import { SectionCard, SaveButton } from './shared';

const VIEWS = [
  { value: 'overview', label: 'Overview' }, { value: 'board', label: 'Board' },
  { value: 'list', label: 'List' }, { value: 'timeline', label: 'Timeline' },
];

export default function ProjectDefaults({ data, setData, workspaceId }) {
  const { show } = useToast();
  const p = data.settings.projects;
  const [draft, setDraft] = useState(() => ({ ...p }));
  const [saving, setSaving] = useState(false);

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const res = await updateProjectDefaults(workspaceId, draft);
      setData((d) => ({ ...d, settings: { ...d.settings, projects: res.settings.projects } }));
      show('Project defaults saved');
    } catch (e) {
      show(e.message || 'Could not save your changes', 'critical');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard title="Projects" description="Workspace-wide defaults applied to every new project.">
      <div className="field">
        <label>Default Project View</label>
        <select value={draft.defaultProjectView} onChange={(e) => setDraft((d) => ({ ...d, defaultProjectView: e.target.value }))}>
          {VIEWS.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
        </select>
      </div>
      <div className="field">
        <label>Project ID Prefix (optional)</label>
        <input value={draft.projectIdPrefix} onChange={(e) => setDraft((d) => ({ ...d, projectIdPrefix: e.target.value.toUpperCase() }))} placeholder="e.g. PRJ" style={{ width: 160 }} />
      </div>
      <div className="flex items-center justify-between" style={{ padding: '8px 0' }}>
        <div>
          <div style={{ fontSize: 13 }}>Allow Members to Create Projects</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 2 }}>
            Fixed policy — only Admins can create projects. Changing who can create projects is a role-permission change, not a workspace setting, so it isn't editable here.
          </div>
        </div>
        <span className="pill" style={{ padding: '2px 8px' }}>OFF</span>
      </div>
      <div style={{ marginTop: 14 }}><SaveButton saving={saving} onClick={save} /></div>
    </SectionCard>
  );
}
