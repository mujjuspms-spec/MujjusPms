import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import InviteModal from '../components/InviteModal';
import { useI18n } from '../hooks/useI18n';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { useWorkspace } from '../hooks/useWorkspace';
import { fetchWorkspaceMembers, changeWorkspaceMemberRole, removeWorkspaceMember } from '../services/workspaces';
import { fetchTemplates, updateTemplate, deleteTemplate, CATEGORY_LABEL } from '../services/projectTemplates';
import { person } from '../services/people';

const ROLE_LABEL = { ADMIN: 'Admin', MEMBER: 'Member', VIEWER: 'Viewer' };

export default function Settings() {
  const { t, lang, setLang } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { activeWorkspace, isWorkspaceAdmin, refreshMemberships } = useWorkspace();
  const navigate = useNavigate();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [members, setMembers] = useState(null);
  const [roleChange, setRoleChange] = useState(null); // { userId, name, from, to }
  const [roleChangeBusy, setRoleChangeBusy] = useState(false);
  const [myTemplates, setMyTemplates] = useState(null);

  useEffect(() => {
    if (!activeWorkspace) return;
    fetchWorkspaceMembers(activeWorkspace.id).then(setMembers);
    if (isWorkspaceAdmin) refreshTemplates();
  }, [activeWorkspace?.id, isWorkspaceAdmin]);

  function refreshTemplates() {
    fetchTemplates({ mine: 'true' }).then(setMyTemplates);
  }
  async function archiveTemplate(t) {
    await updateTemplate(t.id, { isArchived: !t.isArchived });
    refreshTemplates();
  }
  async function removeTemplate(t) {
    if (!window.confirm(`Delete the "${t.name}" template? This can't be undone.`)) return;
    try {
      await deleteTemplate(t.id);
      refreshTemplates();
    } catch (e) {
      window.alert(e.message || 'Could not delete this template');
    }
  }

  async function confirmRoleChange() {
    if (!roleChange) return;
    setRoleChangeBusy(true);
    try {
      await changeWorkspaceMemberRole(activeWorkspace.id, roleChange.userId, roleChange.to);
      setMembers(await fetchWorkspaceMembers(activeWorkspace.id));
      setRoleChange(null);
    } catch (e) {
      window.alert(e.message || 'Could not change this role');
    } finally {
      setRoleChangeBusy(false);
    }
  }
  async function removeMember(userId) {
    if (!window.confirm('Remove this person from the workspace?')) return;
    try {
      await removeWorkspaceMember(activeWorkspace.id, userId);
      setMembers(await fetchWorkspaceMembers(activeWorkspace.id));
      if (userId === user?.id) await refreshMemberships();
    } catch (e) {
      window.alert(e.message || 'Could not remove this person');
    }
  }

  return (
    <section className="view">
      <div className="view-header">
        <div>
          <div className="view-title">{t('nav.settings')}</div>
          <div className="view-subtitle">{t('settings.sub')}</div>
        </div>
      </div>

      <div className="two-col-layout" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, alignItems: 'start' }}>
        <div className="col gap-16">
          <div className="card card-pad">
            <h3 style={{ fontSize: 14.5, marginBottom: 14 }}>Workspace</h3>
            <div className="field">
              <label>Workspace name</label>
              <input value={activeWorkspace?.name || ''} disabled />
            </div>
            <div className="field">
              <label>Time zone</label>
              <input value={activeWorkspace?.timezone || ''} disabled />
            </div>
          </div>

          <div className="card card-pad">
            <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
              <h3 style={{ fontSize: 14.5 }}>Members & permissions</h3>
              {isWorkspaceAdmin && <button className="btn btn-primary btn-sm" onClick={() => setInviteOpen(true)}>{t('common.invite')}</button>}
            </div>
            <div className="col gap-10">
              {(members || []).map((m) => {
                const p = person(m.userId);
                return (
                  <div key={m.userId} className="flex items-center gap-10" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <Avatar person={p} size={30} />
                    <div className="grow">
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}{m.userId === user?.id ? ' (You)' : ''}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{m.email}</div>
                    </div>
                    {isWorkspaceAdmin ? (
                      <select
                        value={m.role}
                        style={{ width: 110, fontSize: 12 }}
                        onChange={(e) => setRoleChange({ userId: m.userId, name: m.name, from: m.role, to: e.target.value })}
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="MEMBER">Member</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                    ) : (
                      <span className="pill pill-done" style={{ padding: '2px 8px' }}>{ROLE_LABEL[m.role]}</span>
                    )}
                    {isWorkspaceAdmin && (
                      <button className="btn-icon" title="Remove from workspace" onClick={() => removeMember(m.userId)}>
                        <Icon name="i-x" className="icon icon-sm" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <p style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 10 }}>Workspace roles are enforced on the backend — a workspace always keeps at least one Admin.</p>
          </div>

          {isWorkspaceAdmin && (
            <div className="card card-pad">
              <h3 style={{ fontSize: 14.5, marginBottom: 12 }}>Workspace Templates</h3>
              {(myTemplates || []).length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                  No workspace templates yet — save a project as a template, or duplicate a system template from the New Project gallery.
                </p>
              ) : (
                <div className="col gap-8">
                  {myTemplates.map((t) => (
                    <div key={t.id} className="flex items-center gap-10" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)', opacity: t.isArchived ? 0.55 : 1 }}>
                      <div className="grow">
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{CATEGORY_LABEL[t.category] || t.category} · {t.phaseCount} phases · {t.taskCount} tasks{t.isArchived ? ' · Archived' : ''}</div>
                      </div>
                      <button className="btn btn-secondary btn-sm" onClick={() => archiveTemplate(t)}>{t.isArchived ? 'Unarchive' : 'Archive'}</button>
                      <button className="btn-icon" title="Delete template" onClick={() => removeTemplate(t)}>
                        <Icon name="i-trash" className="icon icon-sm" style={{ color: 'var(--status-critical)' }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {isWorkspaceAdmin && (
            <div className="card card-pad">
              <h3 style={{ fontSize: 14.5, marginBottom: 12 }}>Governance</h3>
              <div className="col gap-8">
                <button className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => navigate('/settings/integrations')}>
                  <Icon name="i-link" className="icon icon-sm" /> Integrations — SSO, Slack, Calendar &amp; more
                </button>
                <button className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => navigate('/automations')}>
                  <Icon name="i-sparkle" className="icon icon-sm" /> Automation rules
                </button>
                <button className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => navigate('/audit-log')}>
                  <Icon name="i-shield" className="icon icon-sm" /> Audit log
                </button>
                <button className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => navigate('/settings/api')}>
                  <Icon name="i-globe" className="icon icon-sm" /> API &amp; webhooks
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="col gap-16">
          <div className="card card-pad">
            <h3 style={{ fontSize: 14.5, marginBottom: 14 }}>Preferences</h3>
            <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
              <span style={{ fontSize: 13 }}>{t('common.darkmode')}</span>
              <div className={`switch${theme === 'dark' ? ' on' : ''}`} onClick={toggleTheme}><i /></div>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 13 }}>{t('common.language')}</span>
              <div className="lang-toggle">
                <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
                <button className={lang === 'ar' ? 'active' : ''} onClick={() => setLang('ar')}>AR</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {inviteOpen && <InviteModal onClose={() => setInviteOpen(false)} />}
      {roleChange && (
        <Modal
          title={`Change ${roleChange.name} from ${ROLE_LABEL[roleChange.from]} to ${ROLE_LABEL[roleChange.to]}?`}
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
