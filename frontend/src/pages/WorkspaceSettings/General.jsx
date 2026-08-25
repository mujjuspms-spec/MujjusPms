import { useRef, useState } from 'react';
import Avatar from '../../components/Avatar';
import Icon from '../../components/Icon';
import { useToast } from '../../components/Toast';
import { useWorkspace } from '../../hooks/useWorkspace';
import { updateGeneral, uploadWorkspaceLogo, removeWorkspaceLogo } from '../../services/workspaceSettings';
import { SectionCard, SaveButton } from './shared';

const INDUSTRIES = ['Technology', 'Healthcare', 'MedTech', 'Biotech', 'Finance', 'Education', 'Consulting', 'Government', 'Manufacturing', 'Retail', 'Marketing', 'Other'];
const TEAM_SIZES = ['1', '2–10', '11–50', '51–200', '201–500', '500+'];
const TIMEZONES = [
  'UTC', 'Asia/Riyadh', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Karachi', 'Asia/Singapore',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'America/New_York', 'America/Chicago',
  'America/Denver', 'America/Los_Angeles', 'Africa/Cairo', 'Australia/Sydney',
];
const MAX_LOGO_BYTES = 5 * 1024 * 1024;

export function workspaceAvatarProps(name, logoUrl) {
  const initials = (name || '').trim().split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'W';
  return { name, avatarUrl: logoUrl, color: 'var(--brand-gradient)', initials };
}

export default function General({ data, setData, workspaceId }) {
  const { refreshMemberships } = useWorkspace();
  const { show: showToast } = useToast();
  const fileInputRef = useRef(null);
  const [draft, setDraft] = useState(() => ({ ...data.general }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState('');
  const [slugWarning, setSlugWarning] = useState(null);

  function set(key, value) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function onPickLogo(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setLogoError('');
    if (!file.type.startsWith('image/')) { setLogoError('Please choose an image file.'); return; }
    if (file.size > MAX_LOGO_BYTES) { setLogoError('Image must be under 5MB.'); return; }
    setLogoBusy(true);
    try {
      const res = await uploadWorkspaceLogo(workspaceId, file);
      setData((d) => ({ ...d, general: res.general }));
      setDraft((d) => ({ ...d, logoUrl: res.general.logoUrl }));
    } catch (err) {
      setLogoError(err.message || 'Could not upload that image');
    } finally {
      setLogoBusy(false);
    }
  }

  async function onRemoveLogo() {
    setLogoBusy(true);
    setLogoError('');
    try {
      const res = await removeWorkspaceLogo(workspaceId);
      setData((d) => ({ ...d, general: res.general }));
      setDraft((d) => ({ ...d, logoUrl: null }));
    } catch (err) {
      setLogoError(err.message || 'Could not remove the logo');
    } finally {
      setLogoBusy(false);
    }
  }

  async function save() {
    if (saving) return;
    if (!draft.name?.trim()) { setError('Workspace name is required.'); return; }
    setSaving(true);
    setError('');
    setSlugWarning(null);
    try {
      const res = await updateGeneral(workspaceId, {
        name: draft.name.trim(), description: draft.description, slug: draft.slug,
        industry: draft.industry, teamSize: draft.teamSize, defaultLanguage: draft.defaultLanguage,
        timezone: draft.timezone, dateFormat: draft.dateFormat, timeFormat: draft.timeFormat, startOfWeek: draft.startOfWeek,
      });
      setData((d) => ({ ...d, general: res.general }));
      setDraft(res.general);
      if (res.slugWarning) setSlugWarning(res.slugWarning);
      if (res.general.name !== data.general.name) await refreshMemberships();
      showToast('General settings saved');
    } catch (err) {
      setError(err.message || 'Could not save your changes');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <SectionCard title="Workspace">
        <div className="flex items-center gap-16" style={{ marginBottom: 18 }}>
          <div style={{ position: 'relative' }}>
            <Avatar person={workspaceAvatarProps(draft.name, draft.logoUrl)} size={56} />
            <button
              className="btn-icon" title="Change logo" disabled={logoBusy}
              onClick={() => fileInputRef.current?.click()}
              style={{ position: 'absolute', bottom: -4, insetInlineEnd: -4, width: 22, height: 22, background: 'var(--surface-1)', border: '1px solid var(--border-strong)' }}
            >
              <Icon name="i-edit" style={{ width: 11, height: 11 }} />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={onPickLogo} />
          </div>
          <div>
            <div className="flex items-center gap-10">
              <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', fontSize: 11.5 }} disabled={logoBusy} onClick={() => fileInputRef.current?.click()}>
                {logoBusy ? 'Uploading…' : 'Change Logo'}
              </button>
              {draft.logoUrl && (
                <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', fontSize: 11.5, color: 'var(--status-critical)' }} disabled={logoBusy} onClick={onRemoveLogo}>
                  Remove
                </button>
              )}
            </div>
            {logoError && <p style={{ fontSize: 11.5, color: 'var(--status-critical)', marginTop: 4 }}>{logoError}</p>}
          </div>
        </div>

        <div className="field">
          <label>Workspace Name *</label>
          <input value={draft.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div className="field">
          <label>Description</label>
          <textarea rows={2} value={draft.description} onChange={(e) => set('description', e.target.value)} placeholder="Venture studio focused on healthcare innovation…" />
        </div>
        <div className="field">
          <label>Workspace URL</label>
          <div className="flex items-center gap-6">
            <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>mujuzpm.com/w/</span>
            <input value={draft.slug} onChange={(e) => set('slug', e.target.value)} style={{ flex: 1 }} />
          </div>
          {slugWarning && <p style={{ fontSize: 11.5, color: 'var(--status-warn, var(--status-critical))', marginTop: 6 }}>{slugWarning}</p>}
        </div>
        <div className="flex gap-12">
          <div className="field grow">
            <label>Industry</label>
            <select value={draft.industry} onChange={(e) => set('industry', e.target.value)}>
              <option value="">Not set</option>
              {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div className="field grow">
            <label>Team Size</label>
            <select value={draft.teamSize} onChange={(e) => set('teamSize', e.target.value)}>
              <option value="">Not set</option>
              {TEAM_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Regional defaults" description="Used for project deadlines, calendar, activity timestamps, timesheets, Gantt and reminders across the workspace.">
        <div className="flex gap-12">
          <div className="field grow">
            <label>Default Language</label>
            <select value={draft.defaultLanguage} onChange={(e) => set('defaultLanguage', e.target.value)}>
              <option value="en">English</option>
              <option value="ar">Arabic</option>
            </select>
          </div>
          <div className="field grow">
            <label>Default Time Zone</label>
            <select value={draft.timezone} onChange={(e) => set('timezone', e.target.value)}>
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-12">
          <div className="field grow">
            <label>Date Format</label>
            <select value={draft.dateFormat} onChange={(e) => set('dateFormat', e.target.value)}>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
          <div className="field grow">
            <label>Time Format</label>
            <select value={draft.timeFormat} onChange={(e) => set('timeFormat', e.target.value)}>
              <option value="12h">12-hour</option>
              <option value="24h">24-hour</option>
            </select>
          </div>
          <div className="field grow">
            <label>Start of Week</label>
            <select value={draft.startOfWeek} onChange={(e) => set('startOfWeek', e.target.value)}>
              <option value="Saturday">Saturday</option>
              <option value="Sunday">Sunday</option>
              <option value="Monday">Monday</option>
            </select>
          </div>
        </div>
        {error && <p style={{ fontSize: 12, color: 'var(--status-critical)', marginBottom: 8 }}>{error}</p>}
        <SaveButton saving={saving} onClick={save} />
      </SectionCard>
    </>
  );
}
