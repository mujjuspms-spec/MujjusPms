import { useEffect, useState } from 'react';
import Modal from './Modal';
import { PROJECTS, fetchProjectMembers, addProjectMember, removeProjectMember } from '../services/projects';

// Assign/unassign a Member or Viewer to specific projects — existence of a
// ProjectMember row is the sole meaning of "assigned"; write-vs-read-only
// comes entirely from the person's workspace role, not from anything here.
export default function ProjectAssignmentModal({ personId, personName, onClose }) {
  const [assignedIds, setAssignedIds] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      const entries = await Promise.all(PROJECTS.map(async (pr) => {
        const members = await fetchProjectMembers(pr.id);
        return [pr.id, members.some((m) => m.userId === personId)];
      }));
      setAssignedIds(new Set(entries.filter(([, has]) => has).map(([id]) => id)));
    })();
  }, [personId]);

  async function toggle(projectId, checked) {
    setBusyId(projectId);
    try {
      if (checked) await addProjectMember(projectId, personId);
      else await removeProjectMember(projectId, personId);
      setAssignedIds((prev) => {
        const next = new Set(prev);
        if (checked) next.add(projectId); else next.delete(projectId);
        return next;
      });
    } catch (e) {
      window.alert(e.message || 'Could not update project access');
    } finally {
      setBusyId(null);
    }
  }

  const filtered = PROJECTS.filter((pr) => pr.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Modal title={`Manage Project Access — ${personName}`} onClose={onClose} footer={<button className="btn btn-primary btn-sm" onClick={onClose}>Done</button>}>
      {PROJECTS.length > 5 && (
        <input
          value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects…"
          style={{ marginBottom: 10, width: '100%', border: '1px solid var(--border-strong)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '7px 10px', fontSize: 13 }}
        />
      )}
      {assignedIds === null ? (
        <p style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <p style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>{PROJECTS.length === 0 ? 'No projects in this workspace yet.' : 'No projects match this search.'}</p>
      ) : (
        <div className="col gap-4" style={{ maxHeight: 320, overflowY: 'auto' }}>
          {filtered.map((pr) => (
            <label key={pr.id} className="flex items-center gap-8" style={{ fontSize: 13, padding: '6px 2px', cursor: 'pointer' }}>
              <input
                type="checkbox" style={{ width: 'auto' }}
                checked={assignedIds.has(pr.id)} disabled={busyId === pr.id}
                onChange={(e) => toggle(pr.id, e.target.checked)}
              />
              {pr.name}
            </label>
          ))}
        </div>
      )}
    </Modal>
  );
}
