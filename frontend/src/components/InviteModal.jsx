import { useState } from 'react';
import Modal from './Modal';
import { useI18n } from '../hooks/useI18n';
import { useWorkspace } from '../hooks/useWorkspace';
import { sendInvitation } from '../services/workspaces';

export default function InviteModal({ onClose }) {
  const { t } = useI18n();
  const { activeWorkspace } = useWorkspace();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!email.trim() || busy) return;
    setBusy(true); setError('');
    try {
      await sendInvitation(activeWorkspace.id, email.trim(), role);
      onClose();
    } catch (e) {
      setError(e.message || 'Could not send this invitation');
      setBusy(false);
    }
  }

  return (
    <Modal
      title={t('common.invite')}
      onClose={onClose}
      footer={<>
        <button className="btn btn-secondary btn-sm" onClick={onClose}>{t('common.cancel')}</button>
        <button className="btn btn-primary btn-sm" disabled={!email.trim() || busy} onClick={submit}>
          {busy ? 'Sending…' : t('common.invite')}
        </button>
      </>}
    >
      <div className="field">
        <label>Email</label>
        <input type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
      </div>
      <div className="field">
        <label>Role</label>
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="ADMIN">Admin</option>
          <option value="MEMBER">Member</option>
          <option value="VIEWER">Viewer</option>
        </select>
        <p style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 6 }}>
          {role === 'ADMIN' && 'Full workspace access. Can create and manage projects and team members.'}
          {role === 'MEMBER' && 'Can work on assigned projects and create/edit tasks.'}
          {role === 'VIEWER' && 'Can only view assigned projects and their tasks.'}
        </p>
      </div>
      {error && <p style={{ fontSize: 12.5, color: 'var(--status-critical)' }}>{error}</p>}
    </Modal>
  );
}
