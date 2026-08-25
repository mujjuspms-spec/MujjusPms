import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import Icon from './Icon';
import { useI18n } from '../hooks/useI18n';
import { useWorkspace } from '../hooks/useWorkspace';
import CreateWorkspaceModal from './CreateWorkspaceModal';

export const NAV_TOP = [
  { to: '/dashboard', icon: 'i-grid', key: 'nav.dashboard' },
  { to: '/projects', icon: 'i-folder', key: 'nav.projects' },
];
export const NAV_VIEWS = [
  { to: '/board', icon: 'i-board', key: 'nav.board' },
  { to: '/list', icon: 'i-list', key: 'nav.list' },
  { to: '/timeline', icon: 'i-gantt', key: 'nav.timeline' },
  { to: '/calendar', icon: 'i-calendar', key: 'nav.calendar' },
  { to: '/workload', icon: 'i-users', key: 'nav.workload' },
  { to: '/issues', icon: 'i-alert-t', key: 'nav.issues', label: 'Issues' },
];
export const NAV_COMPANY = [
  { to: '/goals', icon: 'i-target', key: 'nav.goals' },
  { to: '/reports', icon: 'i-activity', key: 'nav.reports' },
  { to: '/budgets', icon: 'i-wallet', key: 'nav.budget', badge: 'USD' },
  { to: '/timesheets', icon: 'i-clock', key: 'nav.timesheets' },
  { to: '/approvals', icon: 'i-shield', key: 'nav.approvals', label: 'My Approvals' },
  { to: '/team', icon: 'i-users', key: 'nav.team' },
  { to: '/settings', icon: 'i-settings', key: 'nav.settings' },
];
export const NAV_ADMIN = [
  { to: '/automations', icon: 'i-sparkle', key: 'nav.automations', label: 'Automations' },
];

// Viewer: strictly a read-only visitor to assigned projects — no
// workspace-management or reporting surfaces at all.
const VIEWER_VIEW_PATHS = new Set(['/board', '/list', '/timeline', '/calendar']);
// Member: full operational toolset within assigned projects, but no
// workspace-member-management, admin reporting, or workspace settings.
const MEMBER_COMPANY_PATHS = new Set(['/goals', '/budgets', '/timesheets', '/approvals']);

function navForRole(role) {
  if (role === 'VIEWER') {
    return { top: NAV_TOP, views: NAV_VIEWS.filter((i) => VIEWER_VIEW_PATHS.has(i.to)), company: [], admin: [] };
  }
  if (role === 'MEMBER') {
    return { top: NAV_TOP, views: NAV_VIEWS, company: NAV_COMPANY.filter((i) => MEMBER_COMPANY_PATHS.has(i.to)), admin: [] };
  }
  return { top: NAV_TOP, views: NAV_VIEWS, company: NAV_COMPANY, admin: NAV_ADMIN };
}

function NavItem({ item, onNavigate }) {
  const { t } = useI18n();
  return (
    <NavLink to={item.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} onClick={onNavigate}>
      <Icon name={item.icon} />
      <span className="nav-label">{item.label || t(item.key)}</span>
      {item.badge && <span className="nav-badge">{item.badge}</span>}
    </NavLink>
  );
}

function WorkspaceSwitcher() {
  const { memberships, activeWorkspace, switchWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  if (!activeWorkspace) return null;
  const initials = activeWorkspace.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="popover-wrap" style={{ display: 'block' }}>
      <div className="workspace-switch" role="button" tabIndex={0} onClick={() => setOpen((o) => !o)}>
        <div className="ws-logo">{initials}</div>
        <div className="workspace-text grow">
          <div className="name truncate">{activeWorkspace.name}</div>
          <div className="plan">{activeWorkspace.role === 'ADMIN' ? 'Admin' : activeWorkspace.role === 'MEMBER' ? 'Member' : 'Viewer'}</div>
        </div>
        <Icon name="i-chevron-down" className="icon icon-sm nav-label" style={{ color: 'var(--ink-muted)' }} />
      </div>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 55 }} onClick={() => setOpen(false)} />
          <div className="popover" style={{ top: 'calc(100% + 4px)', minWidth: 240 }}>
            {memberships.map((m) => (
              <div
                key={m.workspace.id}
                className="flex items-center gap-8"
                style={{ padding: '8px 6px', borderRadius: 8, cursor: 'pointer', fontWeight: m.workspace.id === activeWorkspace.id ? 700 : 500, fontSize: 13 }}
                onClick={() => { switchWorkspace(m.workspace.id); setOpen(false); }}
              >
                {m.workspace.id === activeWorkspace.id && <Icon name="i-check" className="icon icon-sm" style={{ color: 'var(--brand-500)' }} />}
                <span className="truncate grow">{m.workspace.name}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--border)', margin: '8px 0' }} />
            <div
              className="flex items-center gap-8"
              style={{ padding: '8px 6px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--brand-600)' }}
              onClick={() => { setOpen(false); setCreating(true); }}
            >
              <Icon name="i-plus" className="icon icon-sm" />
              <span>Create new workspace</span>
            </div>
          </div>
        </>
      )}
      {creating && <CreateWorkspaceModal onClose={() => setCreating(false)} />}
    </div>
  );
}

export default function Sidebar({ onOpenCopilot, mobileOpen = false, onCloseMobile }) {
  const { t } = useI18n();
  const { role } = useWorkspace();
  const [collapsed, setCollapsed] = useState(false);
  const nav = navForRole(role);

  return (
    <>
      {mobileOpen && <div className="mobile-nav-backdrop" onClick={onCloseMobile} />}
      <aside id="sidebar" className={`${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark">M</div>
          <div className="brand-text">
            <div className="brand-name">MujuzPM</div>
            <div className="brand-sub">{t('side.brand.sub')}</div>
          </div>
          <button className="btn-icon mobile-nav-close" onClick={onCloseMobile} aria-label="Close menu">
            <Icon name="i-x" className="icon icon-sm" />
          </button>
        </div>

        <WorkspaceSwitcher />

        <nav className="nav">
          {nav.top.map((i) => <NavItem key={i.to} item={i} onNavigate={onCloseMobile} />)}
          <div className="nav-section-title">{t('nav.section.views')}</div>
          {nav.views.map((i) => <NavItem key={i.to} item={i} onNavigate={onCloseMobile} />)}
          {nav.company.length > 0 && <div className="nav-section-title">{t('nav.section.company')}</div>}
          {nav.company.map((i) => <NavItem key={i.to} item={i} onNavigate={onCloseMobile} />)}
          {nav.admin.length > 0 && (
            <>
              <div className="nav-section-title">Governance</div>
              {nav.admin.map((i) => <NavItem key={i.to} item={i} onNavigate={onCloseMobile} />)}
            </>
          )}
        </nav>

        <div className="sidebar-foot">
          <div className="upgrade-card nav-label">
            <h4>{t('side.ai.title')}</h4>
            <p>{t('side.ai.sub')}</p>
            <button className="btn btn-sm" style={{ width: '100%', background: 'rgba(255,255,255,.18)', color: '#fff' }} onClick={onOpenCopilot}>{t('side.ai.cta')}</button>
          </div>
          <button className="btn btn-ghost collapse-btn" onClick={() => setCollapsed((c) => !c)}>
            <Icon name="i-chevron-start" className="icon icon-sm" style={{ transform: collapsed ? 'rotate(180deg)' : 'none' }} />
            <span className="nav-label">{t('side.collapse')}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
