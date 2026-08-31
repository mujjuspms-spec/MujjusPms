import { useState } from 'react';
import Icon from './Icon';
import { createPerson } from '../services/people';
import { PROJECTS } from '../services/projects';
import { useToast } from './Toast';

// Sends invitation(s) — never creates an account or a password. `lockedProject`
// (from a project's own Team tab) scopes the invite to exactly that project
// as a read-only line; without it (from the workspace Team page), the Admin
// picks any number of projects, each becoming its own invitation.
export default function AddTeamMemberModal({ onClose, lockedProject }) {
  const { show } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [workspaceRole, setWorkspaceRole] = useState('MEMBER');
  const [projectIds, setProjectIds] = useState(lockedProject ? [lockedProject.id] : []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function toggleProject(id) {
    setProjectIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit() {
    if (!name.trim() || !email.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      const res = await createPerson({ name: name.trim(), email: email.trim(), role: role.trim(), workspaceRole, projectIds });
      if (res.invitations.length === 0) {
        setError(res.skipped[0]?.reason || 'No new invitations were created');
        setSaving(false);
        return;
      }
      show(res.existingUser ? 'Invitation sent. They can accept it from their account.' : 'Invitation sent. They\'ll be asked to create an account to accept it.');
      onClose();
    } catch (e) {
      setError(e.message || 'Could not send this invitation');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ width: 440 }}>
        <div className="modal-head">
          <h3 style={{ fontSize: 15 }}>Add team member</h3>
          <button className="btn-icon" onClick={onClose} aria-label="Close"><Icon name="i-x" className="icon icon-sm" /></button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>Full name</label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jordan Lee" />
          </div>
          <div className="field">
            <label>Work email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jordan@mujuzpm.com" />
          </div>
          <div className="field">
            <label>Job title (optional)</label>
            <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Clinical Operations Lead" />
          </div>
          <div className="field">
            <label>Workspace role</label>
            <select value={workspaceRole} onChange={(e) => setWorkspaceRole(e.target.value)}>
              <option value="ADMIN">Admin</option>
              <option value="MEMBER">Member</option>
              <option value="VIEWER">Viewer</option>
            </select>
            <p style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 4 }}>
              {workspaceRole === 'ADMIN' && 'Full workspace access. Can create and manage projects and team members.'}
              {workspaceRole === 'MEMBER' && 'Can work on assigned projects and create/edit tasks.'}
              {workspaceRole === 'VIEWER' && 'Can only view assigned projects and their tasks.'}
            </p>
          </div>
          <div className="field">
            <label>Project{lockedProject ? '' : 's'}</label>
            {lockedProject ? (
              <div style={{ fontSize: 13, padding: '9px 11px', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', color: 'var(--ink-secondary)' }}>
                {lockedProject.name}
              </div>
            ) : (
              <div className="col gap-4" style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', padding: '6px 10px' }}>
                {PROJECTS.length === 0 && <p style={{ fontSize: 12, color: 'var(--ink-muted)', padding: '4px 0' }}>No projects in this workspace yet.</p>}
                {PROJECTS.map((pr) => (
                  <label key={pr.id} className="flex items-center gap-8" style={{ fontSize: 12.5, padding: '4px 2px', cursor: 'pointer' }}>
                    <input type="checkbox" style={{ width: 'auto' }} checked={projectIds.includes(pr.id)} onChange={() => toggleProject(pr.id)} />
                    {pr.name}
                  </label>
                ))}
              </div>
            )}
            <p style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 4 }}>
              {projectIds.length === 0 ? 'Leave unselected to invite them to the workspace only, with no project yet.' : 'One invitation is sent per selected project.'}
            </p>
          </div>
          {error && <p style={{ fontSize: 12.5, color: 'var(--status-critical)' }}>{error}</p>}
          <p style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>
            An invitation will be sent to this email. Existing MujuzPM users can accept it from their account. New users will be asked to create an account before joining this project.
          </p>
        </div>
        <div className="modal-foot">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" disabled={!name.trim() || !email.trim() || saving} onClick={submit}>
            {saving ? 'Sending…' : 'Send invitation'}
          </button>
        </div>
      </div>
    </div>
  );
}
