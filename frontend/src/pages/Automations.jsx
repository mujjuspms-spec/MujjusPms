import { useEffect, useState } from 'react';
import Icon from '../components/Icon';
import { fetchAutomationRules, createAutomationRule, updateAutomationRule, deleteAutomationRule } from '../services/automations';
import { PROJECTS } from '../services/projects';
import { PEOPLE } from '../services/people';
import { TASK_STATUSES as STATUSES } from '../utils/format';
const TRIGGERS = [
  { value: 'status_change', label: 'Task status changes to…' },
  { value: 'budget_threshold', label: 'Task budget usage reaches…' },
  { value: 'due_date_approaching', label: 'Task is due within…' },
];
const ACTIONS = [
  { value: 'notify_owner', label: 'Notify the project owner' },
  { value: 'notify_assignee', label: 'Notify the task assignee' },
  { value: 'notify_user', label: 'Notify a specific person' },
  { value: 'set_priority', label: 'Set priority to urgent' },
];

function describeTrigger(rule) {
  const cfg = rule.triggerConfig || {};
  if (rule.triggerType === 'status_change') return `status → ${cfg.to}`;
  if (rule.triggerType === 'budget_threshold') return `budget ≥ ${cfg.percent}%`;
  if (rule.triggerType === 'due_date_approaching') return `due within ${cfg.daysBefore} day${cfg.daysBefore === 1 ? '' : 's'}`;
  return rule.triggerType;
}

export default function Automations() {
  const [rules, setRules] = useState([]);
  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [triggerType, setTriggerType] = useState('status_change');
  const [toStatus, setToStatus] = useState('done');
  const [percent, setPercent] = useState(90);
  const [daysBefore, setDaysBefore] = useState(3);
  const [action, setAction] = useState('notify_owner');
  const [notifyUserId, setNotifyUserId] = useState(PEOPLE[0]?.id || '');
  const [error, setError] = useState(null);

  function load() { fetchAutomationRules().then(setRules).catch((e) => setError(e.message)); }
  useEffect(load, []);

  async function addRule() {
    if (!name.trim()) return;
    const triggerConfig =
      triggerType === 'status_change' ? { to: toStatus }
      : triggerType === 'budget_threshold' ? { percent: Number(percent) }
      : { daysBefore: Number(daysBefore) };
    try {
      await createAutomationRule({
        name: name.trim(), projectId: projectId || null,
        triggerType, triggerConfig,
        actionType: action,
        actionConfig: action === 'set_priority' ? { priority: 'urgent' } : action === 'notify_user' ? { userId: notifyUserId } : {},
      });
      setName('');
      load();
    } catch (e) { setError(e.message); }
  }

  async function toggle(rule) {
    await updateAutomationRule(rule.id, { enabled: !rule.enabled });
    load();
  }
  async function remove(id) {
    await deleteAutomationRule(id);
    load();
  }

  return (
    <section className="view">
      <div className="view-header">
        <div>
          <div className="view-title">Automation rules</div>
          <div className="view-subtitle">When something happens to a task, do something automatically.</div>
        </div>
      </div>

      {error && <div className="card card-pad" style={{ color: 'var(--status-critical)', fontSize: 13, marginBottom: 16 }}>{error}</div>}

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14.5, marginBottom: 12 }}>New rule</h3>
        <div className="field"><label>Name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ping me when a critical task is done" /></div>
        <div className="flex gap-12 wrap">
          <div className="field grow">
            <label>Scope</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">All ventures</option>
              {PROJECTS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="field grow">
            <label>When</label>
            <select value={triggerType} onChange={(e) => setTriggerType(e.target.value)}>
              {TRIGGERS.map((tr) => <option key={tr.value} value={tr.value}>{tr.label}</option>)}
            </select>
          </div>
          {triggerType === 'status_change' && (
            <div className="field" style={{ width: 140 }}>
              <label>Status</label>
              <select value={toStatus} onChange={(e) => setToStatus(e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          {triggerType === 'budget_threshold' && (
            <div className="field" style={{ width: 110 }}>
              <label>Percent</label>
              <input type="number" min="1" max="500" value={percent} onChange={(e) => setPercent(e.target.value)} />
            </div>
          )}
          {triggerType === 'due_date_approaching' && (
            <div className="field" style={{ width: 110 }}>
              <label>Days before</label>
              <input type="number" min="0" max="60" value={daysBefore} onChange={(e) => setDaysBefore(e.target.value)} />
            </div>
          )}
          <div className="field grow">
            <label>Then</label>
            <select value={action} onChange={(e) => setAction(e.target.value)}>
              {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
          {action === 'notify_user' && (
            <div className="field grow">
              <label>Who</label>
              <select value={notifyUserId} onChange={(e) => setNotifyUserId(e.target.value)}>
                {PEOPLE.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
        </div>
        {triggerType === 'due_date_approaching' && (
          <p style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: -4, marginBottom: 12 }}>Checked every 6 hours, not instantly — due-date rules can't fire off a single event the way status/budget rules do.</p>
        )}
        <button className="btn btn-primary btn-sm" onClick={addRule}><Icon name="i-plus" className="icon icon-sm" />Create rule</button>
      </div>

      <div className="col gap-10">
        {rules.map((r) => (
          <div key={r.id} className="card card-pad flex items-center gap-12">
            <div className={`switch${r.enabled ? ' on' : ''}`} onClick={() => toggle(r)}><i /></div>
            <div className="grow">
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{r.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>
                {r.projectId ? PROJECTS.find((p) => p.id === r.projectId)?.name : 'All ventures'} · when {describeTrigger(r)} · {ACTIONS.find((a) => a.value === r.actionType)?.label}
              </div>
            </div>
            <button className="btn-icon" onClick={() => remove(r.id)}><Icon name="i-trash" className="icon icon-sm" /></button>
          </div>
        ))}
        {rules.length === 0 && <div className="card card-pad" style={{ fontSize: 13, color: 'var(--ink-muted)' }}>No automation rules yet.</div>}
      </div>
    </section>
  );
}
