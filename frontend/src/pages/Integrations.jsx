import { useEffect, useState } from 'react';
import Icon from '../components/Icon';
import { fetchIntegrations, updateIntegration, testSlack, connectGoogleCalendar, syncGoogleCalendar } from '../services/integrations';
import { fetchAiStatus } from '../services/ai';

function StatusPill({ connected }) {
  return <span className={`pill ${connected ? 'pill-done' : 'pill-backlog'}`}><span className="dot" />{connected ? 'Connected' : 'Not connected'}</span>;
}

export default function Integrations() {
  const [cfg, setCfg] = useState(null);
  const [slackUrl, setSlackUrl] = useState('');
  const [msg, setMsg] = useState(null);
  const [serperConfigured, setSerperConfigured] = useState(false);
  const [testing, setTesting] = useState(false);
  const [calMsg, setCalMsg] = useState(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchIntegrations().then((c) => { setCfg(c); setSlackUrl(c.slack.webhookUrl || ''); });
    fetchAiStatus().then(setSerperConfigured);
    const params = new URLSearchParams(window.location.search);
    if (params.get('calendarConnected')) setCalMsg('Google Calendar connected.');
    if (params.get('calendarError')) setCalMsg(`Couldn't connect: ${params.get('calendarError').replace(/_/g, ' ')}`);
  }, []);



  async function saveSlack() {
    const updated = await updateIntegration('slack', { webhookUrl: slackUrl });
    setCfg((c) => ({ ...c, slack: updated }));
    setMsg(updated.connected ? 'Slack webhook saved.' : null);
  }
  async function runSlackTest() {
    setMsg(null);
    try {
      await testSlack();
      setMsg('Test message sent to Slack — check the channel your webhook posts to.');
    } catch (e) { setMsg(e.message); }
  }

  async function connectCalendar() {
    try {
      const url = await connectGoogleCalendar();
      window.location.href = url;
    } catch (e) { setCalMsg(e.message); }
  }
  async function runCalendarSync() {
    setCalMsg(null); setSyncing(true);
    try {
      const r = await syncGoogleCalendar();
      setCalMsg(`Synced ${r.synced}/${r.total} project due dates to Google Calendar.${r.errors.length ? ` ${r.errors.length} failed.` : ''}`);
    } catch (e) { setCalMsg(e.message); }
    setSyncing(false);
  }

  if (!cfg) return null;
  const calCfg = cfg.googleCalendar || {};
  const calHasApp = !!calCfg.clientId;
  const calConnected = !!calCfg.refreshToken;

  return (
    <section className="view">
      <div className="view-header">
        <div>
          <div className="view-title">Integrations</div>
          <div className="view-subtitle">Connect the tools your team already runs on.</div>
        </div>
      </div>

      <div className="col gap-16">
        <div className="card card-pad ai-card">
          <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
            <div className="flex items-center gap-10"><Icon name="i-sparkle" className="icon" style={{ color: 'var(--brand-500)' }} /><h3 style={{ fontSize: 14.5 }}>AI Copilot (Serper Search)</h3></div>
            <StatusPill connected={serperConfigured} />
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 12 }}>Your backend uses the Serper Google Search API to power AI Copilot web searches. The API key is securely managed as an environment variable (SERPER_API_KEY) and cannot be edited from the browser.</p>
        </div>

        <div className="card card-pad">
          <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
            <div className="flex items-center gap-10"><Icon name="i-message" className="icon" /><h3 style={{ fontSize: 14.5 }}>Slack</h3></div>
            <StatusPill connected={cfg.slack.connected} />
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 12 }}>Paste an Incoming Webhook URL from your Slack workspace (Slack → Apps → Incoming Webhooks → Add to Slack). No OAuth app review needed — this is live the moment you save it.</p>
          <div className="flex gap-8">
            <input className="grow" value={slackUrl} onChange={(e) => setSlackUrl(e.target.value)} placeholder="https://hooks.slack.com/services/…" style={{ border: '1px solid var(--border-strong)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '9px 11px', fontSize: 13 }} />
            <button className="btn btn-secondary btn-sm" onClick={saveSlack}>Save</button>
            <button className="btn btn-primary btn-sm" onClick={runSlackTest} disabled={!cfg.slack.connected}>Send test</button>
          </div>
          {msg && <p style={{ fontSize: 12, color: 'var(--brand-600)', marginTop: 8 }}>{msg}</p>}
        </div>

        <h3 style={{ fontSize: 13, color: 'var(--ink-muted)', margin: '4px 0 -4px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Single sign-on</h3>
        {[
          { key: 'googleOAuth', name: 'Google sign-in', icon: 'i-mail', note: 'Register an OAuth client in Google Cloud Console (APIs & Services → Credentials → OAuth client ID → Web application), add this exact redirect URI, then paste the values here to let anyone at your company sign in with Google.' },
          { key: 'microsoftOAuth', name: 'Microsoft sign-in', icon: 'i-grid', note: 'Register an app in the Azure Portal (App registrations), add this exact redirect URI, then paste the values here to let anyone at your company sign in with a Microsoft work account.' },
        ].map((p) => (
          <SsoCard key={p.key} provider={p} value={cfg[p.key]} onSaved={(updated) => setCfg((c) => ({ ...c, [p.key]: updated }))} />
        ))}

        <h3 style={{ fontSize: 13, color: 'var(--ink-muted)', margin: '4px 0 -4px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Other tools</h3>

        <div className="card card-pad">
          <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
            <div className="flex items-center gap-10"><Icon name="i-calendar" className="icon" /><h3 style={{ fontSize: 14.5 }}>Google Calendar</h3></div>
            <StatusPill connected={calConnected} />
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 6 }}>Register an OAuth client in Google Cloud Console (APIs & Services → Credentials), add this exact redirect URI, save it below, then connect your account to push project due dates as real calendar events.</p>
          <code style={{ display: 'block', fontSize: 11.5, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 9px', marginBottom: 10, wordBreak: 'break-all' }}>{window.location.origin}/api/integrations/googleCalendar/callback</code>
          <IntegrationFields providerKey="googleCalendar" fields={[['clientId', 'OAuth Client ID'], ['clientSecret', 'OAuth Client Secret']]} value={cfg.googleCalendar} onSaved={(updated) => setCfg((c) => ({ ...c, googleCalendar: updated }))} />
          <div className="flex gap-8" style={{ marginTop: 10 }}>
            <button className="btn btn-secondary btn-sm" onClick={connectCalendar} disabled={!calHasApp}>{calConnected ? 'Reconnect account' : 'Connect account'}</button>
            <button className="btn btn-primary btn-sm" onClick={runCalendarSync} disabled={!calConnected || syncing}>{syncing ? 'Syncing…' : 'Sync due dates now'}</button>
          </div>
          {calMsg && <p style={{ fontSize: 12, color: 'var(--brand-600)', marginTop: 8 }}>{calMsg}</p>}
        </div>

        {[
          { key: 'docusign', name: 'DocuSign', icon: 'i-id', note: 'E-signature for investment docs — not built yet.' },
          { key: 'quickbooks', name: 'QuickBooks', icon: 'i-wallet', note: 'Automatic accounting sync — not built yet.' },
        ].map((p) => (
          <div key={p.key} className="card card-pad" style={{ opacity: 0.65 }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-10"><Icon name={p.icon} className="icon" /><h3 style={{ fontSize: 14.5 }}>{p.name}</h3></div>
              <span className="pill pill-backlog"><span className="dot" />Coming soon</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 6 }}>{p.note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function IntegrationFields({ providerKey, fields, value, onSaved }) {
  const [vals, setVals] = useState(() => Object.fromEntries(fields.map(([k]) => [k, value?.[k] || ''])));
  async function save() {
    const updated = await updateIntegration(providerKey, vals);
    onSaved(updated);
  }
  return (
    <div className="flex gap-8 wrap">
      {fields.map(([key, label]) => (
        <input
          key={key} value={vals[key]} onChange={(e) => setVals((f) => ({ ...f, [key]: e.target.value }))}
          placeholder={label} style={{ flex: '1 1 200px', border: '1px solid var(--border-strong)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '9px 11px', fontSize: 13 }}
        />
      ))}
      <button className="btn btn-secondary btn-sm" onClick={save}>Save</button>
    </div>
  );
}

function SsoCard({ provider, value, onSaved }) {
  const redirectPath = `/api/auth/sso/${provider.key === 'googleOAuth' ? 'google' : 'microsoft'}/callback`;
  return (
    <div className="card card-pad">
      <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
        <div className="flex items-center gap-10"><Icon name={provider.icon} className="icon" /><h3 style={{ fontSize: 14.5 }}>{provider.name}</h3></div>
        <StatusPill connected={value?.connected} />
      </div>
      <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 6 }}>{provider.note}</p>
      <code style={{ display: 'block', fontSize: 11.5, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 9px', marginBottom: 10, wordBreak: 'break-all' }}>{window.location.origin}{redirectPath}</code>
      <IntegrationFields providerKey={provider.key} fields={[['clientId', 'OAuth Client ID'], ['clientSecret', 'OAuth Client Secret']]} value={value} onSaved={onSaved} />
    </div>
  );
}
