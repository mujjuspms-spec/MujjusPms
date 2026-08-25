import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import { useI18n } from '../hooks/useI18n';
import { useAuth } from '../hooks/useAuth';
import { useWorkspace } from '../hooks/useWorkspace';
import { fetchGoals, createGoal, updateGoal, deleteGoal } from '../services/goals';
import { person, PEOPLE } from '../services/people';
import { project as getProject, PROJECTS } from '../services/projects';

export default function Goals() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { isWorkspaceAdmin: isAdmin } = useWorkspace();
  const navigate = useNavigate();
  const [goals, setGoals] = useState(null);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [quarter, setQuarter] = useState('Q1 2027');
  const editableProjects = PROJECTS.filter((p) => isAdmin || p.myRole === 'member');
  const [projectId, setProjectId] = useState(editableProjects[0]?.id || '');
  const [ownerId, setOwnerId] = useState(user?.id || PEOPLE[0]?.id || '');
  const canEditGoal = (g) => isAdmin || getProject(g.project)?.myRole === 'member';

  useEffect(() => { fetchGoals().then(setGoals); }, []);

  async function addGoal() {
    if (!title.trim() || !projectId || !ownerId) return;
    const goal = await createGoal({ projectId, ownerId, quarter, title: title.trim(), progress: 0 });
    setGoals((gs) => [goal, ...(gs || [])]);
    setTitle(''); setAdding(false);
  }

  async function bumpProgress(g, delta) {
    const next = Math.max(0, Math.min(100, g.progress + delta));
    const updated = await updateGoal(g.id, { progress: next });
    setGoals((gs) => gs.map((x) => (x.id === g.id ? updated : x)));
  }

  async function removeGoal(id) {
    await deleteGoal(id);
    setGoals((gs) => gs.filter((g) => g.id !== id));
  }

  return (
    <section className="view">
      <div className="view-header">
        <div>
          <div className="view-title">{t('nav.goals')}</div>
          <div className="view-subtitle">Quarterly objectives across the portfolio.</div>
        </div>
        {editableProjects.length > 0 && (
          <button className="btn btn-primary btn-sm" onClick={() => setAdding((a) => !a)}>
            <Icon name="i-plus" className="icon icon-sm" />New goal
          </button>
        )}
      </div>

      {adding && editableProjects.length > 0 && (
        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <div className="field"><label>Goal</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Close the Series A round" autoFocus /></div>
          <div className="flex gap-12 wrap">
            <div className="field grow">
              <label>Venture</label>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                {editableProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="field grow">
              <label>Owner</label>
              <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
                {PEOPLE.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="field" style={{ width: 140 }}>
              <label>Quarter</label>
              <input value={quarter} onChange={(e) => setQuarter(e.target.value)} placeholder="Q1 2027" />
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={addGoal}>Create goal</button>
        </div>
      )}

      <div className="col gap-14">
        {goals === null && <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>Loading…</p>}
        {goals?.length === 0 && <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>No goals yet — add the first one.</p>}
        {goals?.map((g) => {
          const owner = person(g.ownerId);
          const proj = getProject(g.project);
          return (
            <div key={g.id} className="card card-pad">
              <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                <span className="pill pill-todo">{g.quarter}</span>
                <div className="flex items-center gap-10">
                  <span style={{ fontSize: 12, color: 'var(--ink-muted)', cursor: 'pointer' }} onClick={() => navigate(`/projects/${g.project}`)}>{proj?.name}</span>
                  {canEditGoal(g) && (
                    <button className="btn-icon" title="Delete goal" onClick={() => removeGoal(g.id)}><Icon name="i-trash" className="icon icon-sm" /></button>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 12 }}>{g.title}</div>
              <div className="flex items-center gap-12">
                {canEditGoal(g) && <button className="btn-icon" onClick={() => bumpProgress(g, -10)}>−</button>}
                <div className="meter grow"><span style={{ width: g.progress + '%' }} /></div>
                {canEditGoal(g) && <button className="btn-icon" onClick={() => bumpProgress(g, 10)}>+</button>}
                <span className="tabular" style={{ fontSize: 12.5, fontWeight: 700, width: 40, textAlign: 'end' }}>{g.progress}%</span>
              </div>
              <div className="flex items-center gap-8" style={{ marginTop: 10 }}>
                <Avatar person={owner} size={22} /><span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{owner?.name}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
