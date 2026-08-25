import { useState } from 'react';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { useWorkspace } from '../../hooks/useWorkspace';
import { archiveWorkspace, unarchiveWorkspace, deleteWorkspace } from '../../services/workspaceSettings';
import { SectionCard } from './shared';

function DeleteWorkspaceModal({ workspaceName, onClose, onDeleted }) {
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const matches = confirmText === workspaceName;

  async function submit() {
    if (!matches || busy) return;
    setBusy(true);
    setError('');
    try {
      await onDeleted(confirmText);
    } catch (e) {
      setError(e.message || 'Could not delete this workspace');
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Delete Workspace" onClose={onClose} busy={busy}
      footer={<>
        <button className="btn btn-secondary btn-sm" disabled={busy} onClick={onClose}>Cancel</button>
        <button className="btn btn-primary btn-sm" style={{ background: 'var(--status-critical)' }} disabled={!matches || busy} onClick={submit}>
          {busy ? 'Deleting…' : 'Delete Workspace'}
        </button>
      </>}
    >
      <p style={{ fontSize: 13, marginBottom: 10 }}>
        Permanently delete <b>{workspaceName}</b> and all of its projects, tasks, members, and settings.
      </p>
      <p style={{ fontSize: 13, color: 'var(--status-critical)', marginBottom: 14 }}>This action cannot be undone.</p>
      <div className="field">
        <label>Type {workspaceName} to confirm</label>
        <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoFocus />
      </div>
      {error && <p style={{ fontSize: 12.5, color: 'var(--status-critical)' }}>{error}</p>}
    </Modal>
  );
}

export default function DangerZone({ data, workspaceId }) {
  const { show } = useToast();
  const { refreshMemberships } = useWorkspace();
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isArchived, setIsArchived] = useState(data.general.isArchived);

  async function toggleArchive() {
    setArchiveBusy(true);
    try {
      const res = isArchived ? await unarchiveWorkspace(workspaceId) : await archiveWorkspace(workspaceId);
      setIsArchived(res.general.isArchived);
      show(res.general.isArchived ? 'Workspace archived' : 'Workspace unarchived');
      await refreshMemberships();
    } catch (e) {
      show(e.message || 'Could not update the archive state', 'critical');
    } finally {
      setArchiveBusy(false);
    }
  }

  async function confirmDelete(confirmName) {
    await deleteWorkspace(workspaceId, confirmName);
    show('Workspace deleted');
    setDeleteOpen(false);
    window.location.href = '/dashboard';
  }

  return (
    <>
      <SectionCard title="Archive Workspace" description="Hides this workspace from active use without deleting any data. Reversible at any time.">
        <button className="btn btn-secondary btn-sm" disabled={archiveBusy} onClick={toggleArchive}>
          {archiveBusy ? 'Saving…' : isArchived ? 'Unarchive Workspace' : 'Archive Workspace'}
        </button>
      </SectionCard>

      <SectionCard title="Delete Workspace" description="Permanently delete this workspace and all of its data.">
        <p style={{ fontSize: 13, color: 'var(--ink-secondary)', marginBottom: 12 }}>
          Permanently delete <b>{data.general.name}</b> and its workspace data. This action cannot be undone.
        </p>
        <button className="btn btn-secondary btn-sm" style={{ color: 'var(--status-critical)', borderColor: 'var(--status-critical)' }} onClick={() => setDeleteOpen(true)}>
          Delete Workspace
        </button>
      </SectionCard>

      {deleteOpen && (
        <DeleteWorkspaceModal workspaceName={data.general.name} onClose={() => setDeleteOpen(false)} onDeleted={confirmDelete} />
      )}
    </>
  );
}
