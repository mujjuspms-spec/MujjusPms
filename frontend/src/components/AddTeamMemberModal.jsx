import { useState } from 'react';
import Icon from './Icon';
import { createPerson } from '../services/people';
import { useToast } from './Toast';

export default function AddTeamMemberModal({ onClose }) {
  const { show } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [workspaceRole, setWorkspaceRole] = useState('MEMBER');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!name.trim() || !email.trim() || password.length < 6 || saving) return;
    setSaving(true);
    setError('');
    try {
      const res = await createPerson({ name: name.trim(), email: email.trim(), role: role.trim(), workspaceRole, password });
      if (res && res.wasInvited) {
        show('Invitation sent. They can log in to their existing account to accept it.');
      }
      onClose();
    } catch (e) {
      setError(e.message || 'Could not add this team member');
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
          <div className="flex gap-12">
            <div className="field grow">
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
            <div className="field grow">
              <label>Temporary password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
            </div>
          </div>
          {error && <p style={{ fontSize: 12.5, color: 'var(--status-critical)' }}>{error}</p>}
          <p style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>
            They can sign in right away with this email and password, then be added to specific projects from the Team tab.
          </p>
        </div>
        <div className="modal-foot">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" disabled={!name.trim() || !email.trim() || password.length < 6 || saving} onClick={submit}>
            {saving ? 'Adding…' : 'Add team member'}
          </button>
        </div>
      </div>
    </div>
  );
}
