import { useEffect, useMemo, useState } from 'react';
import Avatar from '../../components/Avatar';
import Icon from '../../components/Icon';
import Modal from '../../components/Modal';
import ProjectAssignmentModal from '../../components/ProjectAssignmentModal';
import { useToast } from '../../components/Toast';
import { person } from '../../services/people';
import { PROJECTS, fetchProjectMembers } from '../../services/projects';
import { fetchWorkspaceMembers, changeWorkspaceMemberRole, removeWorkspaceMember, sendInvitations } from '../../services/workspaces';
import { SectionCard } from './shared';

const ROLE_LABEL = { ADMIN: 'Admin', MEMBER: 'Member', VIEWER: 'Viewer' };
const ROLE_DESCRIPTIONS = {
  ADMIN: 'Full workspace access. Can create and manage projects and team members.',
  MEMBER: 'Can work on assigned projects and create/edit tasks.',
  VIEWER: 'Can only view assigned projects and their tasks.',
};

function timeAgo(iso) {
  if (!iso) return 'Never';
  const diffDays = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays} days ago`;
}

function InviteModal({ workspaceId, onClose, onInvited }) {
  const { show } = useToast();
  const [emailsText, setEmailsText] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    const emails = emailsText.split(/[\n,]/).map((e) => e.trim()).filter(Boolean);
    if (emails.length === 0 || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await sendInvitations(workspaceId, emails, role);
      const count = res.invitations.length;
      show(count > 0 ? `Sent ${count} invitation${count === 1 ? '' : 's'}${res.skipped.length ? ` (${res.skipped.length} skipped — already invited or a member)` : ''}` : 'Everyone on that list is already invited or a member');
      onInvited();
      onClose();
    } catch (e) {
      setError(e.message || 'Could not send invitations');
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Invite Member" onClose={onClose} busy={busy}
      footer={<>
        <button className="btn btn-secondary btn-sm" disabled={busy} onClick={onClose}>Cancel</button>
        <button className="btn btn-primary btn-sm" disabled={!emailsText.trim() || busy} onClick={submit}>{busy ? 'Sending…' : 'Send Invitations'}</button>
      </>}
    >
      <div className="field">
        <label>Email *</label>
        <textarea
          rows={3} autoFocus value={emailsText} onChange={(e) => setEmailsText(e.target.value)}
          placeholder={'ahmed@example.com\nsara@example.com\njohn@example.com'}
        />
        <p style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 4 }}>One email per line, or comma-separated.</p>
      </div>
      <div className="field">
        <label>Role *</label>
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="ADMIN">Admin</option>
          <option value="MEMBER">Member</option>
          <option value="VIEWER">Viewer</option>
        </select>
        <p style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 6 }}>{ROLE_DESCRIPTIONS[role]}</p>
      </div>
      {error && <p style={{ fontSize: 12.5, color: 'var(--status-critical)' }}>{error}</p>}
    </Modal>
  );
}

function ManageMemberModal({ member, onClose, onChanged }) {
  const p = person(member.userId);
  const [roleChange, setRoleChange] = useState(null);
  const [roleChangeBusy, setRoleChangeBusy] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const { show } = useToast();

  async function confirmRoleChange() {
    setRoleChangeBusy(true);
    try {
      await changeWorkspaceMemberRole(member.workspaceId, member.userId, roleChange);
      show(`${member.name}'s role changed to ${ROLE_LABEL[roleChange]}`);
      onChanged();
      setRoleChange(null);
      onClose();
    } catch (e) {
      show(e.message || 'Could not change this role', 'critical');
    } finally {
      setRoleChangeBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Remove ${member.name} from this workspace?\n\n${member.name} will lose access to all workspace projects.`)) return;
    try {
      await removeWorkspaceMember(member.workspaceId, member.userId);
      show(`${member.name} was removed from the workspace`);
      onChanged();
      onClose();
    } catch (e) {
      show(e.message || 'Could not remove this person', 'critical');
    }
  }

  return (
    <>
      <Modal title="Manage Member" onClose={onClose}>
        <div className="flex items-center gap-12" style={{ marginBottom: 16 }}>
          <Avatar person={p} size={44} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 14.5 }}>{member.name}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{member.email}</div>
          </div>
        </div>
        <div className="col gap-10" style={{ fontSize: 12.5, marginBottom: 16 }}>
          <div className="flex items-center justify-between"><span style={{ color: 'var(--ink-muted)' }}>Job Title</span><span>{member.jobTitle || 'Not set'}</span></div>
          <div className="flex items-center justify-between"><span style={{ color: 'var(--ink-muted)' }}>Role</span><span className="pill pill-done" style={{ padding: '2px 8px' }}>{ROLE_LABEL[member.role]}</span></div>
          <div className="flex items-center justify-between"><span style={{ color: 'var(--ink-muted)' }}>Status</span><span className="pill pill-good" style={{ padding: '2px 8px' }}>Active</span></div>
          <div className="flex items-center justify-between"><span style={{ color: 'var(--ink-muted)' }}>Joined</span><span>{new Date(member.joinedAt).toLocaleDateString()}</span></div>
          <div className="flex items-center justify-between"><span style={{ color: 'var(--ink-muted)' }}>Last Active</span><span>{timeAgo(member.lastLoginAt)}</span></div>
        </div>
        <div className="col gap-8">
          <div className="field">
            <label>Change Role</label>
            <select value={member.role} onChange={(e) => setRoleChange(e.target.value)}>
              <option value="ADMIN">Admin</option>
              <option value="MEMBER">Member</option>
              <option value="VIEWER">Viewer</option>
            </select>
          </div>
          {member.role !== 'ADMIN' && (
            <button className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => setAssigning(true)}>
              <Icon name="i-folder" className="icon icon-sm" /> Manage Project Access
            </button>
          )}
          <button className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start', color: 'var(--status-critical)' }} onClick={remove}>
            <Icon name="i-x" className="icon icon-sm" /> Remove From Workspace
          </button>
        </div>
      </Modal>
      {roleChange && roleChange !== member.role && (
        <Modal
          title={`Change ${member.name} from ${ROLE_LABEL[member.role]} to ${ROLE_LABEL[roleChange]}?`}
          onClose={() => (roleChangeBusy ? null : setRoleChange(null))}
          busy={roleChangeBusy}
          footer={<>
            <button className="btn btn-secondary btn-sm" disabled={roleChangeBusy} onClick={() => setRoleChange(null)}>Cancel</button>
            <button className="btn btn-primary btn-sm" disabled={roleChangeBusy} onClick={confirmRoleChange}>{roleChangeBusy ? 'Saving…' : 'Change Role'}</button>
          </>}
        >
          <p style={{ fontSize: 13, color: 'var(--ink-secondary)' }}>{ROLE_DESCRIPTIONS[roleChange]}</p>
        </Modal>
      )}
      {assigning && <ProjectAssignmentModal personId={member.userId} personName={member.name} onClose={() => setAssigning(false)} />}
    </>
  );
}

export default function MembersPermissions({ workspaceId }) {
  const [members, setMembers] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [projectCounts, setProjectCounts] = useState({});
  const [inviteOpen, setInviteOpen] = useState(false);
  const [managing, setManaging] = useState(null);

  function reload() {
    fetchWorkspaceMembers(workspaceId).then((rows) => setMembers(rows.map((m) => ({ ...m, workspaceId }))));
  }
  useEffect(reload, [workspaceId]);

  useEffect(() => {
    (async () => {
      const counts = {};
      for (const pr of PROJECTS) {
        const rows = await fetchProjectMembers(pr.id);
        for (const m of rows) counts[m.userId] = (counts[m.userId] || 0) + 1;
      }
      setProjectCounts(counts);
    })();
  }, []);

  const filtered = useMemo(() => (members || []).filter((m) => {
    if (roleFilter !== 'ALL' && m.role !== roleFilter) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase()) && !m.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [members, search, roleFilter]);

  return (
    <SectionCard title="Members & Permissions" description="Everyone with access to this workspace, their role, and what they can see.">
      <div className="flex items-center gap-8" style={{ marginBottom: 14 }}>
        <input
          value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search members…"
          style={{ flex: 1, border: '1px solid var(--border-strong)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '8px 11px', fontSize: 13 }}
        />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={{ width: 130 }}>
          <option value="ALL">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="MEMBER">Member</option>
          <option value="VIEWER">Viewer</option>
        </select>
        <button className="btn btn-primary btn-sm" onClick={() => setInviteOpen(true)}>
          <Icon name="i-plus" className="icon icon-sm" /> Invite Member
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'start', color: 'var(--ink-muted)', fontSize: 11.5, borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '9px 10px' }}>Name</th>
              <th style={{ padding: '9px 10px' }}>Email</th>
              <th style={{ padding: '9px 10px' }}>Job Title</th>
              <th style={{ padding: '9px 10px' }}>Role</th>
              <th style={{ padding: '9px 10px' }}>Status</th>
              <th style={{ padding: '9px 10px' }}>Projects</th>
              <th style={{ padding: '9px 10px' }}>Last Active</th>
              <th style={{ padding: '9px 10px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => {
              const p = person(m.userId);
              return (
                <tr key={m.userId} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '9px 10px' }}>
                    <div className="flex items-center gap-8"><Avatar person={p} size={26} /><span style={{ fontWeight: 600 }}>{m.name}</span></div>
                  </td>
                  <td style={{ padding: '9px 10px', color: 'var(--ink-muted)' }}>{m.email}</td>
                  <td style={{ padding: '9px 10px', color: 'var(--ink-muted)' }}>{m.jobTitle || 'Not set'}</td>
                  <td style={{ padding: '9px 10px' }}><span className="pill pill-done" style={{ padding: '2px 8px' }}>{ROLE_LABEL[m.role]}</span></td>
                  <td style={{ padding: '9px 10px' }}><span className="pill pill-good" style={{ padding: '2px 8px' }}>Active</span></td>
                  <td style={{ padding: '9px 10px' }}>{m.role === 'ADMIN' ? 'All Projects' : `${projectCounts[m.userId] || 0} project${(projectCounts[m.userId] || 0) === 1 ? '' : 's'}`}</td>
                  <td style={{ padding: '9px 10px', color: 'var(--ink-muted)' }}>{timeAgo(m.lastLoginAt)}</td>
                  <td style={{ padding: '9px 10px' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setManaging(m)}>Manage</button>
                  </td>
                </tr>
              );
            })}
            {members && filtered.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 16, textAlign: 'center', color: 'var(--ink-muted)' }}>No members match this search.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {inviteOpen && <InviteModal workspaceId={workspaceId} onClose={() => setInviteOpen(false)} onInvited={reload} />}
      {managing && <ManageMemberModal member={managing} onClose={() => setManaging(null)} onChanged={reload} />}
    </SectionCard>
  );
}
