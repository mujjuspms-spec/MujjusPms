import { useMemo, useRef, useState } from 'react';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import EditableText from '../components/EditableText';
import { useI18n } from '../hooks/useI18n';
import { useAuth } from '../hooks/useAuth';
import { useWorkspace } from '../hooks/useWorkspace';
import { useTheme } from '../hooks/useTheme';
import { usePreferences } from '../hooks/usePreferences';
import { useToast } from '../components/Toast';
import { useTasksStore } from '../hooks/useTasksStore';
import { PROJECTS } from '../services/projects';

const ROLE_LABEL = { ADMIN: 'Admin', MEMBER: 'Member', VIEWER: 'Viewer' };
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const VIEW_OPTIONS = [
  { value: 'overview', label: 'Overview' }, { value: 'board', label: 'Board' },
  { value: 'list', label: 'List' }, { value: 'gantt', label: 'Gantt' }, { value: 'timeline', label: 'Timeline' },
];

function parseWorkDays(json) {
  try { const arr = JSON.parse(json || '[]'); return Array.isArray(arr) ? arr : []; } catch { return []; }
}

function formatPasswordChanged(iso) {
  if (!iso) return 'Never changed';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function Profile() {
  const { t } = useI18n();
  const { user, updateProfile, uploadAvatar, removeAvatar, changePassword } = useAuth();
  const { activeWorkspace, role } = useWorkspace();
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang } = useI18n();
  const { prefs, setPref } = usePreferences();
  const { show: showToast } = useToast();
  const { tasks } = useTasksStore();

  const fileInputRef = useRef(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  // Section 1: Personal information (beyond name/job-title, which stay on
  // their existing inline-edit-on-blur behavior above, unchanged).
  const [personal, setPersonal] = useState({ phone: user?.phone || '', department: user?.department || '', location: user?.location || '', about: user?.about || '' });
  const [personalSaving, setPersonalSaving] = useState(false);
  const [personalError, setPersonalError] = useState('');

  // Section 2: Work information (capacity + working days/hours).
  const [work, setWork] = useState({
    capacity: user?.capacity ?? 40,
    workDays: new Set(parseWorkDays(user?.workDays)),
    workStart: user?.workStart || '09:00',
    workEnd: user?.workEnd || '17:00',
  });
  const [workSaving, setWorkSaving] = useState(false);
  const [workError, setWorkError] = useState('');

  // Section 4: Preferences (timezone is real backend data; the rest are
  // local display preferences, same persistence pattern as theme/language).
  const [timezone, setTimezone] = useState(user?.timezone || '');
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsError, setPrefsError] = useState('');

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');

  const activeProjects = PROJECTS.length;
  const assignedTasks = useMemo(
    () => tasks.filter((tk) => tk.assignee === user?.id && tk.status !== 'done').length,
    [tasks, user?.id],
  );

  if (!user) return null;

  async function onPickAvatar(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAvatarError('');
    if (!file.type.startsWith('image/')) { setAvatarError('Please choose an image file.'); return; }
    if (file.size > MAX_AVATAR_BYTES) { setAvatarError('Image must be under 5MB.'); return; }
    setAvatarBusy(true);
    try {
      await uploadAvatar(file);
    } catch (err) {
      setAvatarError(err.message || 'Could not upload that photo');
    } finally {
      setAvatarBusy(false);
    }
  }

  async function onRemoveAvatar() {
    setAvatarBusy(true);
    setAvatarError('');
    try {
      await removeAvatar();
    } catch (err) {
      setAvatarError(err.message || 'Could not remove your photo');
    } finally {
      setAvatarBusy(false);
    }
  }

  async function savePersonal() {
    if (personalSaving) return;
    setPersonalSaving(true);
    setPersonalError('');
    try {
      await updateProfile(personal);
      showToast('Personal information saved');
    } catch (err) {
      setPersonalError(err.message || 'Could not save your changes');
    } finally {
      setPersonalSaving(false);
    }
  }

  async function saveWork() {
    if (workSaving) return;
    if (!Number.isInteger(work.capacity) || work.capacity <= 0) { setWorkError('Weekly capacity must be a positive whole number.'); return; }
    if (work.workStart >= work.workEnd) { setWorkError('Working hours start must be before the end.'); return; }
    setWorkSaving(true);
    setWorkError('');
    try {
      await updateProfile({ capacity: work.capacity, workDays: Array.from(work.workDays), workStart: work.workStart, workEnd: work.workEnd });
      showToast('Work information saved');
    } catch (err) {
      setWorkError(err.message || 'Could not save your changes');
    } finally {
      setWorkSaving(false);
    }
  }

  async function savePrefs() {
    if (prefsSaving) return;
    setPrefsSaving(true);
    setPrefsError('');
    try {
      await updateProfile({ timezone });
      showToast('Preferences saved');
    } catch (err) {
      setPrefsError(err.message || 'Could not save your preferences');
    } finally {
      setPrefsSaving(false);
    }
  }

  async function submitPasswordChange() {
    setPwError('');
    if (newPw.length < 6) { setPwError('New password must be at least 6 characters.'); return; }
    if (newPw !== confirmPw) { setPwError('New passwords don’t match.'); return; }
    setPwSaving(true);
    try {
      await changePassword(currentPw, newPw);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      showToast('Password updated');
    } catch (err) {
      setPwError(err.message || 'Could not change your password');
    } finally {
      setPwSaving(false);
    }
  }

  function toggleWorkDay(day) {
    setWork((w) => {
      const next = new Set(w.workDays);
      if (next.has(day)) next.delete(day); else next.add(day);
      return { ...w, workDays: next };
    });
  }

  return (
    <section className="view">
      <div className="view-header">
        <div>
          <div className="view-title">{t('top.profile')}</div>
          <div className="view-subtitle">Your own account details.</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16, alignItems: 'start', maxWidth: 920 }}>
        {/* Personal information */}
        <div className="card card-pad">
          <h3 style={{ fontSize: 14.5, marginBottom: 14 }}>Personal information</h3>
          <div className="flex items-center gap-16" style={{ marginBottom: 18 }}>
            <div style={{ position: 'relative' }}>
              <Avatar person={user} size={64} />
              <button
                className="btn-icon" title="Change photo" disabled={avatarBusy}
                onClick={() => fileInputRef.current?.click()}
                style={{ position: 'absolute', bottom: -4, insetInlineEnd: -4, width: 24, height: 24, background: 'var(--surface-1)', border: '1px solid var(--border-strong)' }}
              >
                <Icon name="i-edit" style={{ width: 12, height: 12 }} />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={onPickAvatar} />
            </div>
            <div className="grow">
              <EditableText
                value={user.name} onSave={(v) => v && updateProfile({ name: v })}
                textStyle={{ fontSize: 17, fontWeight: 700 }}
              />
              <div className="flex items-center gap-8" style={{ marginTop: 2 }}>
                <span style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>{user.email}</span>
                <span className="pill pill-good" style={{ padding: '1px 7px', fontSize: 10.5 }}>Verified</span>
              </div>
              <div className="flex items-center gap-10" style={{ marginTop: 6 }}>
                <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', fontSize: 11.5 }} disabled={avatarBusy} onClick={() => fileInputRef.current?.click()}>
                  {avatarBusy ? 'Uploading…' : 'Change photo'}
                </button>
                {user.avatarUrl && (
                  <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', fontSize: 11.5, color: 'var(--status-critical)' }} disabled={avatarBusy} onClick={onRemoveAvatar}>
                    Remove
                  </button>
                )}
              </div>
              {avatarError && <p style={{ fontSize: 11.5, color: 'var(--status-critical)', marginTop: 4 }}>{avatarError}</p>}
            </div>
          </div>

          <div className="field">
            <label>Job title</label>
            <EditableText value={user.role} onSave={(v) => updateProfile({ role: v })} placeholder="Add job title" />
          </div>

          <div className="flex gap-12">
            <div className="field grow">
              <label>Phone number</label>
              <input value={personal.phone} onChange={(e) => setPersonal((p) => ({ ...p, phone: e.target.value }))} placeholder="+966 ..." />
            </div>
            <div className="field grow">
              <label>Department</label>
              <input value={personal.department} onChange={(e) => setPersonal((p) => ({ ...p, department: e.target.value }))} placeholder="e.g. Technology" />
            </div>
          </div>
          <div className="field">
            <label>Location</label>
            <input value={personal.location} onChange={(e) => setPersonal((p) => ({ ...p, location: e.target.value }))} placeholder="e.g. Riyadh, Saudi Arabia" />
          </div>
          <div className="field">
            <label>About me</label>
            <textarea rows={3} value={personal.about} onChange={(e) => setPersonal((p) => ({ ...p, about: e.target.value }))} placeholder="Short professional bio…" />
          </div>
          {personalError && <p style={{ fontSize: 12, color: 'var(--status-critical)', marginBottom: 8 }}>{personalError}</p>}
          <button className="btn btn-primary btn-sm" disabled={personalSaving} onClick={savePersonal}>
            {personalSaving ? 'Saving…' : 'Save changes'}
          </button>
        </div>

        {/* Work information */}
        <div className="card card-pad">
          <h3 style={{ fontSize: 14.5, marginBottom: 14 }}>Work information</h3>
          <div className="col gap-12" style={{ fontSize: 12.5, marginBottom: 14 }}>
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--ink-muted)' }}>Current Workspace</span>
              <span style={{ fontWeight: 600 }}>{activeWorkspace?.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--ink-muted)' }}>Workspace Role</span>
              <span className="pill pill-done" style={{ padding: '2px 8px' }}>{ROLE_LABEL[role] || role}</span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--ink-muted)' }}>Active Projects</span>
              <span style={{ fontWeight: 600 }}>{activeProjects}</span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--ink-muted)' }}>Assigned Tasks</span>
              <span style={{ fontWeight: 600 }}>{assignedTasks}</span>
            </div>
          </div>

          <div className="field">
            <label>Weekly capacity</label>
            <div className="flex items-center gap-8">
              <input
                type="number" min="1" style={{ width: 90 }}
                value={work.capacity} onChange={(e) => setWork((w) => ({ ...w, capacity: Number(e.target.value) }))}
              />
              <span style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>hours ({user.allocated}h allocated)</span>
            </div>
          </div>

          <div className="field">
            <label>Working days</label>
            <div className="flex wrap gap-6">
              {DAYS.map((d) => (
                <button
                  key={d} type="button"
                  className={work.workDays.has(d) ? 'pill pill-done' : 'pill'}
                  style={{ padding: '3px 10px', cursor: 'pointer', border: '1px solid var(--border-strong)' }}
                  onClick={() => toggleWorkDay(d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-12">
            <div className="field grow">
              <label>Working hours — start</label>
              <input type="time" value={work.workStart} onChange={(e) => setWork((w) => ({ ...w, workStart: e.target.value }))} />
            </div>
            <div className="field grow">
              <label>Working hours — end</label>
              <input type="time" value={work.workEnd} onChange={(e) => setWork((w) => ({ ...w, workEnd: e.target.value }))} />
            </div>
          </div>
          {workError && <p style={{ fontSize: 12, color: 'var(--status-critical)', marginBottom: 8 }}>{workError}</p>}
          <button className="btn btn-primary btn-sm" disabled={workSaving} onClick={saveWork}>
            {workSaving ? 'Saving…' : 'Save changes'}
          </button>
        </div>

        {/* Security */}
        <div className="card card-pad">
          <h3 style={{ fontSize: 14.5, marginBottom: 14 }}>Security</h3>
          <div className="col gap-12">
            <div className="field">
              <label>Current password</label>
              <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} autoComplete="current-password" />
            </div>
            <div className="field">
              <label>New password</label>
              <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" placeholder="At least 6 characters" />
            </div>
            <div className="field">
              <label>Confirm new password</label>
              <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} autoComplete="new-password" />
            </div>
            {pwError && <p style={{ fontSize: 12, color: 'var(--status-critical)' }}>{pwError}</p>}
            <button
              className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }}
              disabled={!currentPw || !newPw || !confirmPw || pwSaving}
              onClick={submitPasswordChange}
            >
              {pwSaving ? 'Saving…' : 'Update password'}
            </button>
          </div>

          <div className="col gap-10" style={{ fontSize: 12.5, marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--ink-muted)' }}>Last password change</span>
              <span>{formatPasswordChanged(user.passwordChangedAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--ink-muted)' }}>Two-Factor Authentication</span>
              <span style={{ color: 'var(--ink-muted)' }}>Not yet available</span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--ink-muted)' }}>Active Sessions</span>
              <span style={{ color: 'var(--ink-muted)' }}>Not yet available</span>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="card card-pad">
          <h3 style={{ fontSize: 14.5, marginBottom: 14 }}>Preferences</h3>
          <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
            <span style={{ fontSize: 13 }}>{t('common.darkmode')}</span>
            <div className={`switch${theme === 'dark' ? ' on' : ''}`} onClick={toggleTheme}><i /></div>
          </div>
          <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
            <span style={{ fontSize: 13 }}>{t('common.language')}</span>
            <div className="lang-toggle">
              <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
              <button className={lang === 'ar' ? 'active' : ''} onClick={() => setLang('ar')}>AR</button>
            </div>
          </div>

          <div className="field">
            <label>Time zone</label>
            <input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="e.g. Asia/Riyadh" />
          </div>
          <div className="flex gap-12">
            <div className="field grow">
              <label>Date format</label>
              <select value={prefs.dateFormat} onChange={(e) => setPref('dateFormat', e.target.value)}>
                <option value="DD MMM YYYY">DD MMM YYYY</option>
                <option value="MMM DD, YYYY">MMM DD, YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
            <div className="field grow">
              <label>Time format</label>
              <select value={prefs.timeFormat} onChange={(e) => setPref('timeFormat', e.target.value)}>
                <option value="12h">12-hour</option>
                <option value="24h">24-hour</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label>Default project view</label>
            <select value={prefs.defaultProjectView} onChange={(e) => setPref('defaultProjectView', e.target.value)}>
              {VIEW_OPTIONS.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </div>

          <div className="col gap-10" style={{ margin: '4px 0 14px' }}>
            {[
              ['emailNotifications', 'Email notifications'],
              ['taskNotifications', 'Task notifications'],
              ['deadlineReminders', 'Deadline reminders'],
            ].map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <span style={{ fontSize: 13 }}>{label}</span>
                <div className={`switch${prefs[key] ? ' on' : ''}`} onClick={() => setPref(key, !prefs[key])}><i /></div>
              </div>
            ))}
          </div>
          {prefsError && <p style={{ fontSize: 12, color: 'var(--status-critical)', marginBottom: 8 }}>{prefsError}</p>}
          <button className="btn btn-primary btn-sm" disabled={prefsSaving} onClick={savePrefs}>
            {prefsSaving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </section>
  );
}
