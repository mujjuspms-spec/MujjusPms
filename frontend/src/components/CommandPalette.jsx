import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon';
import Avatar from './Avatar';
import { NAV_TOP, NAV_VIEWS, NAV_COMPANY, NAV_ADMIN } from './Sidebar';
import { useI18n } from '../hooks/useI18n';
import { useAuth } from '../hooks/useAuth';
import { useWorkspace } from '../hooks/useWorkspace';
import { useTheme } from '../hooks/useTheme';
import { useTasksStore } from '../hooks/useTasksStore';
import { PROJECTS } from '../services/projects';
import { PEOPLE } from '../services/people';
import { HEALTH_META } from './Pill';

export default function CommandPalette({ onClose, onNewTask, onOpenCopilot }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { logout } = useAuth();
  const { isWorkspaceAdmin } = useWorkspace();
  const { theme, toggleTheme } = useTheme();
  const { tasks } = useTasksStore();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function go(path) {
    navigate(path);
    onClose();
  }

  const actions = useMemo(() => [
    { id: 'act-new-task', label: 'New task', icon: 'i-plus', run: () => { onClose(); onNewTask(); } },
    { id: 'act-copilot', label: 'Ask AI Copilot', icon: 'i-sparkle', run: () => { onClose(); onOpenCopilot(); } },
    {
      id: 'act-theme',
      label: theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
      icon: theme === 'dark' ? 'i-sun' : 'i-moon',
      run: () => { toggleTheme(); onClose(); },
    },
    { id: 'act-audit', label: 'Open audit log', icon: 'i-shield', run: () => go('/audit-log'), hidden: !isWorkspaceAdmin },
    { id: 'act-signout', label: 'Sign out', icon: 'i-logout', run: () => { logout(); onClose(); } },
  ].filter((a) => !a.hidden), [theme, isWorkspaceAdmin]);

  const navItems = useMemo(() => {
    const items = [...NAV_TOP, ...NAV_VIEWS, ...NAV_COMPANY, ...(isWorkspaceAdmin ? NAV_ADMIN : [])];
    return items.map((i) => ({ id: `nav-${i.to}`, label: i.label || t(i.key), icon: i.icon, run: () => go(i.to) }));
  }, [isWorkspaceAdmin, t]);

  const q = query.trim().toLowerCase();
  const match = (label) => !q || label.toLowerCase().includes(q);

  const groups = useMemo(() => {
    const list = [];
    const filteredActions = actions.filter((a) => match(a.label));
    if (filteredActions.length) list.push({ title: 'Actions', items: filteredActions });

    const filteredNav = navItems.filter((n) => match(n.label));
    if (filteredNav.length) list.push({ title: 'Go to', items: filteredNav });

    if (q) {
      const projItems = PROJECTS.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 6)
        .map((p) => ({ id: `proj-${p.id}`, label: p.name, sublabel: HEALTH_META[p.health]?.text || p.health, icon: 'i-folder', run: () => go(`/projects/${p.id}`) }));
      if (projItems.length) list.push({ title: 'Projects', items: projItems });

      const taskItems = tasks.filter((tk) => tk.title.toLowerCase().includes(q)).slice(0, 6)
        .map((tk) => ({
          id: `task-${tk.id}`, label: tk.title,
          sublabel: PROJECTS.find((p) => p.id === tk.project)?.name,
          icon: 'i-check', run: () => go(`/projects/${tk.project}`),
        }));
      if (taskItems.length) list.push({ title: 'Tasks', items: taskItems });

      const peopleItems = PEOPLE.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 6)
        .map((p) => ({ id: `person-${p.id}`, label: p.name, sublabel: p.role, avatar: p, run: () => go('/team') }));
      if (peopleItems.length) list.push({ title: 'People', items: peopleItems });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, actions, navItems, tasks]);

  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => { setActiveIndex(0); }, [q]);
  useEffect(() => {
    if (activeIndex >= flatItems.length) setActiveIndex(Math.max(0, flatItems.length - 1));
  }, [flatItems.length, activeIndex]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(flatItems.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); flatItems[activeIndex]?.run(); }
    else if (e.key === 'Escape') { onClose(); }
  }

  let runningIndex = -1;

  return (
    <div className="overlay palette-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal palette-modal">
        <div className="palette-input-row">
          <Icon name="i-search" className="icon icon-sm" />
          <input
            ref={inputRef}
            className="palette-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search or jump to…"
          />
          <kbd>Esc</kbd>
        </div>
        <div className="palette-list" ref={listRef}>
          {flatItems.length === 0 && <div className="palette-empty">No results for "{query}"</div>}
          {groups.map((g) => (
            <div key={g.title} className="palette-group">
              <div className="palette-group-title">{g.title}</div>
              {g.items.map((item) => {
                runningIndex += 1;
                const idx = runningIndex;
                return (
                  <div
                    key={item.id}
                    data-idx={idx}
                    className={`palette-row${idx === activeIndex ? ' active' : ''}`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => item.run()}
                  >
                    {item.avatar ? <Avatar person={item.avatar} size={22} /> : <Icon name={item.icon} className="icon icon-sm" />}
                    <span className="palette-row-label">{item.label}</span>
                    {item.sublabel && <span className="palette-row-sub">{item.sublabel}</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
