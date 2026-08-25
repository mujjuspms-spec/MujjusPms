import { useEffect, useState } from 'react';
import Icon from './Icon';
import { HEALTH_META } from './Pill';
import { fetchTemplateDetail, instantiateTemplate, duplicateTemplate, CATEGORY_LABEL, categoryColor } from '../services/projectTemplates';
import { PEOPLE } from '../services/people';
import { useAuth } from '../hooks/useAuth';
import { useWorkspace } from '../hooks/useWorkspace';

const VIEW_LABEL = { overview: 'Overview', list: 'List', board: 'Board', gantt: 'Gantt', roadmap: 'Roadmap' };

function PhaseNode({ phase }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom: 8 }}>
      <div
        className="flex items-center gap-6" style={{ cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="i-chevron-down" className="icon icon-sm" style={{ transform: open ? 'none' : 'rotate(-90deg)', transition: '.15s' }} />
        {phase.name}
        <span style={{ fontSize: 11, color: 'var(--ink-muted)', fontWeight: 500 }}>({phase.tasks.length})</span>
      </div>
      {open && (
        <div style={{ marginInlineStart: 22, marginTop: 4 }}>
          <TaskNodes tasks={phase.tasks} />
        </div>
      )}
    </div>
  );
}
function TaskNodes({ tasks }) {
  return tasks.map((t) => (
    <div key={t.id} style={{ fontSize: 12.5, color: 'var(--ink-secondary)', padding: '3px 0' }}>
      <div className="flex items-center gap-6">
        <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--ink-muted)' }} />
        {t.name}
      </div>
      {t.children.length > 0 && <div style={{ marginInlineStart: 14 }}><TaskNodes tasks={t.children} /></div>}
    </div>
  ));
}

// Preview + configure + create, in one flow — the spec is explicit that
// opening Preview must never create the project; only submitting the
// configure step (below) does.
export default function TemplateUseFlow({ template, onBack, onCreated }) {
  const { user } = useAuth();
  const { isWorkspaceAdmin } = useWorkspace();
  const [detail, setDetail] = useState(null);
  const [step, setStep] = useState('preview'); // 'preview' | 'configure'
  const [duplicating, setDuplicating] = useState(false);
  const [excludedPhaseIds, setExcludedPhaseIds] = useState(new Set());
  const [name, setName] = useState(template.name);
  const [ownerId, setOwnerId] = useState(user?.id || '');
  const [teamIds, setTeamIds] = useState(new Set());
  const [start, setStart] = useState('');
  const [due, setDue] = useState('');
  const [health, setHealth] = useState('good');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { fetchTemplateDetail(template.id).then(setDetail); }, [template.id]);

  async function handleDuplicate() {
    setDuplicating(true);
    try {
      await duplicateTemplate(template.id);
      window.alert(`Saved a copy of "${template.name}" to My Templates — find it under Settings → Workspace Templates.`);
    } catch (e) {
      window.alert(e.message || 'Could not duplicate this template');
    } finally {
      setDuplicating(false);
    }
  }

  function togglePhase(id) {
    setExcludedPhaseIds((s) => { const next = new Set(s); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }
  function toggleTeam(id) {
    setTeamIds((s) => { const next = new Set(s); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  async function submit() {
    if (!name.trim() || busy) return;
    setBusy(true); setError(null);
    try {
      const { project, defaultView } = await instantiateTemplate(template.id, {
        name: name.trim(), ownerId: ownerId || undefined, teamMemberIds: Array.from(teamIds),
        start: start ? formatDateInput(start) : 'Unscheduled', due: due ? formatDateInput(due) : 'Unscheduled',
        health, excludePhaseIds: Array.from(excludedPhaseIds),
      });
      onCreated(project, defaultView);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  function formatDateInput(isoStr) {
    const [y, m, d] = isoStr.split('-').map(Number);
    if (!y || !m || !d) return 'Unscheduled';
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]} ${y}`;
  }

  if (step === 'configure') {
    return (
      <div>
        <button className="btn-icon" onClick={() => setStep('preview')} style={{ marginBottom: 10 }} aria-label="Back">
          <Icon name="i-chevron-start" className="icon icon-sm" />
        </button>
        <h3 style={{ fontSize: 15, marginBottom: 2 }}>Create "{template.name}" project</h3>
        <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 14 }}>Fill in the details — you can change anything after creation.</p>
        {error && <div style={{ background: 'color-mix(in srgb, var(--status-critical) 12%, transparent)', color: 'var(--status-critical)', fontSize: 12.5, padding: '8px 11px', borderRadius: 8, marginBottom: 14 }}>{error}</div>}
        <div className="field">
          <label>Project name</label>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex gap-12">
          <div className="field grow">
            <label>Owner</label>
            <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
              {PEOPLE.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="field grow">
            <label>Project health</label>
            <select value={health} onChange={(e) => setHealth(e.target.value)}>
              {Object.entries(HEALTH_META).map(([k, m]) => <option key={k} value={k}>{m.text}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-12">
          <div className="field grow">
            <label>Start date</label>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="field grow">
            <label>Target date</label>
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>Team members (optional)</label>
          <div style={{ maxHeight: 130, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 8 }}>
            {PEOPLE.filter((p) => p.id !== ownerId).map((p) => (
              <label key={p.id} className="flex items-center gap-8" style={{ fontSize: 12.5, padding: '4px 0', cursor: 'pointer' }}>
                <input type="checkbox" style={{ width: 'auto' }} checked={teamIds.has(p.id)} onChange={() => toggleTeam(p.id)} />
                {p.name}
              </label>
            ))}
          </div>
        </div>
        {detail && (
          <div className="field">
            <label>Include phases</label>
            <div style={{ maxHeight: 130, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 8 }}>
              {detail.phases.map((p) => (
                <label key={p.id} className="flex items-center gap-8" style={{ fontSize: 12.5, padding: '4px 0', cursor: 'pointer' }}>
                  <input type="checkbox" style={{ width: 'auto' }} checked={!excludedPhaseIds.has(p.id)} onChange={() => togglePhase(p.id)} />
                  {p.name}
                </label>
              ))}
            </div>
          </div>
        )}
        <button className="btn btn-primary" style={{ width: '100%' }} disabled={!name.trim() || busy} onClick={submit}>
          {busy ? 'Creating…' : 'Create Project'}
        </button>
      </div>
    );
  }

  return (
    <div>
      <button className="btn-icon" onClick={onBack} style={{ marginBottom: 10 }} aria-label="Back to gallery">
        <Icon name="i-chevron-start" className="icon icon-sm" />
      </button>
      <div className="flex items-center gap-8" style={{ marginBottom: 4 }}>
        <Icon name={template.icon} className="icon" style={{ color: categoryColor(template.category) }} />
        <h3 style={{ fontSize: 16 }}>{template.name}</h3>
      </div>
      <p style={{ fontSize: 13, color: 'var(--ink-secondary)', marginBottom: 12 }}>{template.description}</p>
      <div className="flex items-center gap-8" style={{ marginBottom: 14 }}>
        <span className="pill" style={{ background: `color-mix(in srgb, ${categoryColor(template.category)} 16%, transparent)`, color: categoryColor(template.category) }}>
          {CATEGORY_LABEL[template.category] || template.category}
        </span>
        <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
          {template.phaseCount} phases · {template.taskCount} tasks
          {template.milestoneCount ? ` · ${template.milestoneCount} milestones` : ''}
          {template.customFieldCount ? ` · ${template.customFieldCount} custom fields` : ''}
        </span>
      </div>
      {template.defaultView && (
        <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 14 }}>
          Recommended view: <b>{VIEW_LABEL[template.defaultView] || template.defaultView}</b>
        </p>
      )}

      <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 12, marginBottom: 14 }}>
        {!detail ? <p style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>Loading structure…</p>
          : detail.phases.map((p) => <PhaseNode key={p.id} phase={p} />)}
      </div>

      <div className="flex gap-8">
        {template.isSystemTemplate && isWorkspaceAdmin && (
          <button className="btn btn-secondary" style={{ flex: 1 }} disabled={duplicating} onClick={handleDuplicate}>
            {duplicating ? 'Duplicating…' : 'Duplicate and customize'}
          </button>
        )}
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setStep('configure')}>Use Template</button>
      </div>
    </div>
  );
}
