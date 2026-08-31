import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import AddTeamMemberModal from '../components/AddTeamMemberModal';
import ProjectAssignmentModal from '../components/ProjectAssignmentModal';
import { useI18n } from '../hooks/useI18n';
import { useAuth } from '../hooks/useAuth';
import { useWorkspace } from '../hooks/useWorkspace';
import { PEOPLE } from '../services/people';
import { PROJECTS, fetchProjectMembers } from '../services/projects';
import { useToast } from '../components/Toast';
import {
  fetchWorkspaceMembers, changeWorkspaceMemberRole, removeWorkspaceMember, resetMemberPassword,
  fetchWorkspaceInvitations, resendInvitation, cancelInvitation,
} from '../services/workspaces';

const ROLE_LABEL = { ADMIN: 'Admin', MEMBER: 'Member', VIEWER: 'Viewer' };

export default function Team() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { activeWorkspace, isWorkspaceAdmin } = useWorkspace();
  const navigate = useNavigate();
  const { show } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [wsMembers, setWsMembers] = useState(null);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [inviteBusyId, setInviteBusyId] = useState(null);
  const [roleChange, setRoleChange] = useState(null); // { userId, name, from, to }
  const [roleChangeBusy, setRoleChangeBusy] = useState(false);
  const [assignFor, setAssignFor] = useState(null); // { id, name }
  const [projectCounts, setProjectCounts] = useState({});
  const [resetPwFor, setResetPwFor] = useState(null); // { userId, name }
  const [newPw, setNewPw] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState('');
  const canAdd = isWorkspaceAdmin;

  useEffect(() => {
    if (!activeWorkspace?.id) return;
    fetchWorkspaceMembers(activeWorkspace.id).then(setWsMembers);
    if (isWorkspaceAdmin) refreshInvites();
  }, [activeWorkspace?.id, isWorkspaceAdmin]);

  function refreshInvites() {
    if (!activeWorkspace?.id) return;
    fetchWorkspaceInvitations(activeWorkspace.id).then(setPendingInvites);
  }

  async function doResend(invitationId) {
    setInviteBusyId(invitationId);
    try {
      await resendInvitation(activeWorkspace.id, invitationId);
      show('Invitation resent.');
      refreshInvites();
    } catch (e) {
      show(e.message || 'Could not resend this invitation', 'critical');
    } finally {
      setInviteBusyId(null);
    }
  }

  async function doCancel(invitationId) {
    if (!window.confirm('Cancel this invitation? The link will stop working.')) return;
    setInviteBusyId(invitationId);
    try {
      await cancelInvitation(activeWorkspace.id, invitationId);
      refreshInvites();
    } catch (e) {
      show(e.message || 'Could not cancel this invitation', 'critical');
    } finally {
      setInviteBusyId(null);
    }
  }

  // Projects column: how many projects each Member/Viewer is assigned to
  // (Admin always shows "All Projects" — no per-project row needed for them).
  useEffect(() => {
    (async () => {
      const counts = {};
      for (const pr of PROJECTS) {
        const members = await fetchProjectMembers(pr.id);
        for (const m of members) counts[m.userId] = (counts[m.userId] || 0) + 1;
      }
      setProjectCounts(counts);
    })();
  }, []);

  async function confirmRoleChange() {
    if (!roleChange) return;
    setRoleChangeBusy(true);
    try {
      await changeWorkspaceMemberRole(activeWorkspace.id, roleChange.userId, roleChange.to);
      setWsMembers(await fetchWorkspaceMembers(activeWorkspace.id));
      setRoleChange(null);
    } catch (e) {
      window.alert(e.message || 'Could not change this role');
    } finally {
      setRoleChangeBusy(false);
    }
  }

  async function submitResetPassword() {
    if (newPw.length < 6) { setPwError('New password must be at least 6 characters.'); return; }
    setPwBusy(true);
    setPwError('');
    try {
      await resetMemberPassword(activeWorkspace.id, resetPwFor.userId, newPw);
      setResetPwFor(null);
      setNewPw('');
    } catch (e) {
      setPwError(e.message || 'Could not reset this password');
    } finally {
      setPwBusy(false);
    }
  }

  async function removeMember(userId) {
    if (!window.confirm('Remove this person from the workspace?')) return;
    try {
      await removeWorkspaceMember(activeWorkspace.id, userId);
      setWsMembers(await fetchWorkspaceMembers(activeWorkspace.id));
    } catch (e) {
      window.alert(e.message || 'Could not remove this person');
    }
  }

  const roleByUserId = Object.fromEntries((wsMembers || []).map((m) => [m.userId, m.role]));

  return (
    <section className="view">
      <div className="view-header">
        <div>
          <div className="view-title">{t('nav.team')}</div>
          <div className="view-subtitle">{t('team.sub')}</div>
        </div>
        {canAdd && (
          <button className="btn btn-primary btn-sm" onClick={() => setAddOpen(true)}>
            <Icon name="i-plus" className="icon icon-sm" />Add team member
          </button>
        )}
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'start', color: 'var(--ink-muted)', fontSize: 11.5, borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '10px 14px' }}>Name</th>
              <th style={{ padding: '10px 14px' }}>Email</th>
              <th style={{ padding: '10px 14px' }}>Job Title</th>
              <th style={{ padding: '10px 14px' }}>Role</th>
              <th style={{ padding: '10px 14px' }}>Projects</th>
              <th style={{ padding: '10px 14px' }}>Status</th>
              <th style={{ padding: '10px 14px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {PEOPLE.map((p) => {
              const role = roleByUserId[p.id];
              const isAdminRow = role === 'ADMIN';
              // Only Admin can drill into someone else's timesheet — everyone
              // can still open their own.
              const canOpen = canAdd || p.id === user?.id;
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 14px' }}>
                    <div
                      className="flex items-center gap-10"
                      style={{ cursor: canOpen ? 'pointer' : 'default' }}
                      onClick={canOpen ? () => navigate(`/team/${p.id}`) : undefined}
                    >
                      <Avatar person={p} size={30} />
                      <span style={{ fontWeight: 600 }}>{p.name}{p.id === user?.id ? ' (You)' : ''}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--ink-muted)' }}>{p.email}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--ink-muted)' }}>{p.role || 'Not set'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    {isWorkspaceAdmin ? (
                      <select
                        value={role || ''} style={{ width: 100, fontSize: 12 }}
                        onChange={(e) => setRoleChange({ userId: p.id, name: p.name, from: role, to: e.target.value })}
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="MEMBER">Member</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                    ) : (
                      <span className="pill pill-done" style={{ padding: '2px 8px' }}>{ROLE_LABEL[role] || '—'}</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {isAdminRow ? (
                      <span style={{ color: 'var(--ink-muted)' }}>All Projects</span>
                    ) : isWorkspaceAdmin ? (
                      <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', fontSize: 12 }} onClick={() => setAssignFor({ id: p.id, name: p.name })}>
                        {projectCounts[p.id] || 0} project{(projectCounts[p.id] || 0) === 1 ? '' : 's'}
                      </button>
                    ) : (
                      <span style={{ color: 'var(--ink-muted)' }}>{projectCounts[p.id] || 0} project{(projectCounts[p.id] || 0) === 1 ? '' : 's'}</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span className="pill pill-good" style={{ padding: '2px 8px' }}>Active</span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {isWorkspaceAdmin && (
                      <div className="flex items-center gap-4">
                        <button className="btn-icon" title="Reset password (only affects legacy accounts — most sign in via Supabase now)" onClick={() => { setResetPwFor({ userId: p.id, name: p.name }); setNewPw(''); setPwError(''); }}>
                          <Icon name="i-shield" className="icon icon-sm" />
                        </button>
                        <button className="btn-icon" title="Remove from workspace" onClick={() => removeMember(p.id)}>
                          <Icon name="i-x" className="icon icon-sm" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {pendingInvites.map((inv) => (
              <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)', opacity: 0.75 }}>
                <td style={{ padding: '10px 14px' }}>
                  <div className="flex items-center gap-10">
                    <div className="avatar" style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--surface-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="i-users" className="icon icon-sm" style={{ color: 'var(--ink-muted)' }} />
                    </div>
                    <span style={{ fontWeight: 600 }}>{inv.name || inv.email}</span>
                  </div>
                </td>
                <td style={{ padding: '10px 14px', color: 'var(--ink-muted)' }}>{inv.email}</td>
                <td style={{ padding: '10px 14px', color: 'var(--ink-muted)' }}>Not set</td>
                <td style={{ padding: '10px 14px' }}>
                  <span className="pill" style={{ padding: '2px 8px' }}>{ROLE_LABEL[inv.role] || inv.role}</span>
                </td>
                <td style={{ padding: '10px 14px', color: 'var(--ink-muted)' }}>{inv.projectName || 'Workspace only'}</td>
                <td style={{ padding: '10px 14px' }}>
                  <span className="pill" style={{ padding: '2px 8px', background: 'color-mix(in srgb, var(--status-warning) 18%, transparent)', color: 'var(--status-warning)' }}>Invitation pending</span>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  {isWorkspaceAdmin && (
                    <div className="flex items-center gap-4">
                      <button className="btn-icon" title="Resend invitation" disabled={inviteBusyId === inv.id} onClick={() => doResend(inv.id)}>
                        <Icon name="i-mail" className="icon icon-sm" />
                      </button>
                      <button className="btn-icon" title="Cancel invitation" disabled={inviteBusyId === inv.id} onClick={() => doCancel(inv.id)}>
                        <Icon name="i-x" className="icon icon-sm" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {addOpen && <AddTeamMemberModal onClose={() => { setAddOpen(false); refreshInvites(); }} />}
      {resetPwFor && (
        <Modal
          title={`Reset ${resetPwFor.name}'s password`}
          onClose={() => (pwBusy ? null : setResetPwFor(null))}
          footer={<>
            <button className="btn btn-secondary btn-sm" disabled={pwBusy} onClick={() => setResetPwFor(null)}>Cancel</button>
            <button className="btn btn-primary btn-sm" disabled={pwBusy} onClick={submitResetPassword}>{pwBusy ? 'Saving…' : 'Reset password'}</button>
          </>}
        >
          <p style={{ fontSize: 12.5, color: 'var(--ink-muted)', marginBottom: 10 }}>
            They'll need to sign in with this new password — let them know it directly, since there's no email notification for this yet.
          </p>
          <div className="field">
            <label>New password</label>
            <input type="password" autoFocus value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="At least 6 characters" />
          </div>
          {pwError && <p style={{ fontSize: 12.5, color: 'var(--status-critical)' }}>{pwError}</p>}
        </Modal>
      )}
      {assignFor && <ProjectAssignmentModal personId={assignFor.id} personName={assignFor.name} onClose={() => setAssignFor(null)} />}
      {roleChange && (
        <Modal
          title={`Change ${roleChange.name} from ${ROLE_LABEL[roleChange.from] || roleChange.from} to ${ROLE_LABEL[roleChange.to]}?`}
          onClose={() => (roleChangeBusy ? null : setRoleChange(null))}
          footer={<>
            <button className="btn btn-secondary btn-sm" disabled={roleChangeBusy} onClick={() => setRoleChange(null)}>Cancel</button>
            <button className="btn btn-primary btn-sm" disabled={roleChangeBusy} onClick={confirmRoleChange}>
              {roleChangeBusy ? 'Saving…' : 'Change Role'}
            </button>
          </>}
        >
          <p style={{ fontSize: 13, color: 'var(--ink-secondary)' }}>
            {roleChange.to === 'ADMIN' && 'Admins get full workspace access — they can manage projects, invite members, and manage workspace users.'}
            {roleChange.to === 'MEMBER' && `${roleChange.name} will be able to work on projects they're assigned to, but won't manage the workspace or other members.`}
            {roleChange.to === 'VIEWER' && `${roleChange.name} will only be able to view projects they're assigned to — no editing.`}
          </p>
        </Modal>
      )}
    </section>
  );
}
