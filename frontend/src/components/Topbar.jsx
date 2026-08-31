import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon';
import Avatar from './Avatar';
import { useI18n } from '../hooks/useI18n';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { useWorkspace } from '../hooks/useWorkspace';
import { fetchNotifications, markNotificationRead } from '../services/notifications';
import { acceptInvitation, declineInvitation } from '../services/workspaces';
import { onRealtime } from '../services/realtime';
import { useToast } from './Toast';
import TimerWidget from './TimerWidget';

const WORKSPACE_ROLE_LABEL = { ADMIN: 'Admin', MEMBER: 'Member', VIEWER: 'Viewer' };

export default function Topbar({ onNewTask, onOpenPalette, onToggleMobileNav }) {
  const { t, lang, setLang } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { role: workspaceRole, isWorkspaceAdmin } = useWorkspace();
  const navigate = useNavigate();
  const { show } = useToast();
  const [openPopover, setOpenPopover] = useState(null);
  const [notifs, setNotifs] = useState([]);
  const [inviteBusyId, setInviteBusyId] = useState(null);
  const unreadCount = notifs.filter((n) => n.unread).length;

  useEffect(() => { fetchNotifications().then(setNotifs); }, []);

  async function respondInvitation(n, accept) {
    setInviteBusyId(n.id);
    try {
      if (accept) {
        await acceptInvitation(n.invitation.token);
        show(`Invitation accepted. You now have access to ${n.invitation.projectName || n.invitation.workspaceName}.`);
      } else {
        await declineInvitation(n.invitation.token);
        show('Invitation declined.');
      }
      const fresh = await fetchNotifications();
      setNotifs(fresh);
    } catch (e) {
      show(e.message || 'Could not respond to this invitation', 'critical');
    } finally {
      setInviteBusyId(null);
    }
  }

  useEffect(() => onRealtime((msg) => {
    if (msg.type === 'notification' && msg.payload.userId === user?.id) {
      setNotifs((ns) => [{ ...msg.payload, unread: true }, ...ns]);
    }
  }), [user?.id]);

  function togglePopover(name) {
    setOpenPopover((cur) => (cur === name ? null : name));
  }

  function openNotif(n) {
    if (n.unread) {
      markNotificationRead(n.id).catch(() => {});
      setNotifs((ns) => ns.map((x) => (x.id === n.id ? { ...x, unread: false } : x)));
    }
    // A pending invitation isn't accepted yet — clicking the row shouldn't
    // navigate to a project they don't have access to; use Accept/Decline.
    const isPendingInvite = n.invitation && n.invitation.status === 'PENDING';
    if (n.projectId && !isPendingInvite) navigate(`/projects/${n.projectId}`);
    setOpenPopover(null);
  }

  if (!user) return null;

  return (
    <header id="topbar">
      <button className="mobile-nav-btn" onClick={onToggleMobileNav} aria-label="Open menu">
        <Icon name="i-list" className="icon icon-sm" />
      </button>
      <button className="search-box" role="search" onClick={onOpenPalette} aria-label={t('top.search')}>
        <Icon name="i-search" className="icon icon-sm" />
        <span className="search-box-placeholder">{t('top.search')}</span>
        <kbd>⌘K</kbd>
      </button>

      <button className="btn btn-primary btn-sm" onClick={onNewTask}>
        <Icon name="i-plus" className="icon icon-sm" /><span>{t('top.new')}</span>
      </button>

      <div className="topbar-right">
        <div className="lang-toggle">
          <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
          <button className={lang === 'ar' ? 'active' : ''} onClick={() => setLang('ar')}>AR</button>
        </div>
        <button className="btn-icon" onClick={toggleTheme} title={t('top.theme')} aria-label={t('top.theme')}>
          <Icon name={theme === 'dark' ? 'i-sun' : 'i-moon'} />
        </button>
        <TimerWidget />

        <div className="popover-wrap">
          <button className="btn-icon icon-btn-badge" aria-haspopup="true" onClick={() => togglePopover('notif')} title={t('top.notifications')}>
            <Icon name="i-bell" />
            {unreadCount > 0 && <span className="badge-dot" />}
          </button>
          {openPopover === 'notif' && (
            <div className="popover popover-end popover-wide">
              <div style={{ padding: '12px 14px', fontWeight: 700, fontSize: 13, borderBottom: '1px solid var(--border)' }}>{t('top.notifications')}</div>
              {notifs.length === 0 && <div style={{ padding: 14, fontSize: 12.5, color: 'var(--ink-muted)' }}>No notifications yet.</div>}
              {notifs.map((n) => (
                <div key={n.id} className={`notif-item${n.unread ? ' unread' : ''}`} onClick={() => openNotif(n)}>
                  <Icon name={n.icon} className="icon icon-sm" style={{ color: n.color, marginTop: 2 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5 }}>{n.text}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 3 }}>{new Date(n.time).toLocaleString()}</div>
                    {n.invitation && n.invitation.status === 'PENDING' && (
                      <div className="flex gap-8" style={{ marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
                        <button
                          className="btn btn-primary btn-sm" style={{ padding: '4px 10px', fontSize: 11.5 }}
                          disabled={inviteBusyId === n.id} onClick={() => respondInvitation(n, true)}
                        >
                          {inviteBusyId === n.id ? '…' : 'Accept'}
                        </button>
                        <button
                          className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', fontSize: 11.5 }}
                          disabled={inviteBusyId === n.id} onClick={() => respondInvitation(n, false)}
                        >
                          Decline
                        </button>
                      </div>
                    )}
                    {n.invitation && n.invitation.status !== 'PENDING' && (
                      <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 4, fontStyle: 'italic' }}>
                        {n.invitation.status === 'ACCEPTED' ? 'Accepted' : 'Declined'}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="popover-wrap">
          <button className="user-chip" aria-haspopup="true" onClick={() => togglePopover('user')}>
            <Avatar person={user} size={32} />
            <div className="user-meta nav-label">
              <div className="u-name">{user.name}</div>
              <div className="u-role">{WORKSPACE_ROLE_LABEL[workspaceRole] || ''}</div>
            </div>
            <Icon name="i-chevron-down" className="icon icon-sm nav-label" style={{ color: 'var(--ink-muted)' }} />
          </button>
          {openPopover === 'user' && (
            <div className="popover popover-end">
              <button className="dd-item" onClick={() => navigate('/profile')}><Icon name="i-id" className="icon icon-sm" />{t('top.profile')}</button>
              <button className="dd-item" onClick={() => navigate('/settings')}><Icon name="i-settings" className="icon icon-sm" />{t('nav.settings')}</button>
              {isWorkspaceAdmin ? (
                <button className="dd-item" onClick={() => navigate('/audit-log')}><Icon name="i-shield" className="icon icon-sm" />Audit log</button>
              ) : null}
              {user?.globalRole === 'admin' ? (
                <button className="dd-item" onClick={() => navigate('/admin/approvals')}><Icon name="i-check" className="icon icon-sm" />Admin Approvals</button>
              ) : null}
              <div className="dd-sep" />
              <button className="dd-item" onClick={logout}><Icon name="i-logout" className="icon icon-sm" />{t('top.signout')}</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
