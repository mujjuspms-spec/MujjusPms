import { useState } from 'react';
import { useToast } from '../../components/Toast';
import { updateSecuritySettings } from '../../services/workspaceSettings';
import { SectionCard, SaveButton, ToggleRow } from './shared';

export default function SecurityAccess({ data, setData, workspaceId }) {
  const { show } = useToast();
  const s = data.settings.security;
  const [domainsText, setDomainsText] = useState(() => s.allowedEmailDomains.join(', '));
  const [allowExternalSharing, setAllowExternalSharing] = useState(s.allowExternalSharing);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const domains = domainsText.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);
      const res = await updateSecuritySettings(workspaceId, { allowedEmailDomains: domains, allowExternalSharing });
      setData((d) => ({ ...d, settings: { ...d.settings, security: res.settings.security } }));
      setDomainsText(res.settings.security.allowedEmailDomains.join(', '));
      show('Security settings saved');
    } catch (e) {
      show(e.message || 'Could not save your changes', 'critical');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <SectionCard title="Security & Access">
        <div className="field">
          <label>Allowed Email Domains</label>
          <input value={domainsText} onChange={(e) => setDomainsText(e.target.value)} placeholder="karama.tech, company.com" />
          <p style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 4 }}>
            Comma-separated. If set, new invitations can only be sent to these domains — existing members are never affected just by adding a restriction.
          </p>
        </div>
        <ToggleRow
          label="External Sharing" hint="Whether Admins can generate public share links for projects."
          checked={allowExternalSharing} onChange={setAllowExternalSharing}
        />
        <div style={{ marginTop: 14 }}><SaveButton saving={saving} onClick={save} /></div>
      </SectionCard>

      <SectionCard title="Policy">
        <div className="flex items-center justify-between" style={{ padding: '6px 0' }}>
          <span style={{ fontSize: 13 }}>Invite Permission</span>
          <span className="pill pill-done" style={{ padding: '2px 8px' }}>Only Admin can invite</span>
        </div>
        <div className="flex items-center justify-between" style={{ padding: '6px 0' }}>
          <span style={{ fontSize: 13 }}>Two-Factor Authentication</span>
          <span style={{ color: 'var(--ink-muted)', fontSize: 12.5 }}>Not yet available</span>
        </div>
        <div className="flex items-center justify-between" style={{ padding: '6px 0' }}>
          <span style={{ fontSize: 13 }}>Session Duration / Idle Timeout</span>
          <span style={{ color: 'var(--ink-muted)', fontSize: 12.5 }}>Not yet available</span>
        </div>
      </SectionCard>
    </>
  );
}
