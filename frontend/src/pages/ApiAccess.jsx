import { useEffect, useState } from 'react';
import Icon from '../components/Icon';
import { fetchApiKeys, createApiKey, revokeApiKey, fetchWebhooks, createWebhook, updateWebhook, deleteWebhook } from '../services/apiAccess';

const EVENTS = ['task.created', 'task.updated', 'task.deleted', 'project.created'];

export default function ApiAccess() {
  const [keys, setKeys] = useState(null);
  const [keyName, setKeyName] = useState('');
  const [freshKey, setFreshKey] = useState(null);

  const [hooks, setHooks] = useState(null);
  const [hookUrl, setHookUrl] = useState('');
  const [hookEvents, setHookEvents] = useState([]);
  const [freshSecret, setFreshSecret] = useState(null);

  useEffect(() => { fetchApiKeys().then(setKeys); fetchWebhooks().then(setHooks); }, []);

  async function addKey() {
    if (!keyName.trim()) return;
    const { key, rawKey } = await createApiKey(keyName.trim());
    setKeys((ks) => [key, ...(ks || [])]);
    setFreshKey(rawKey);
    setKeyName('');
  }
  async function revoke(id) {
    await revokeApiKey(id);
    setKeys((ks) => ks.map((k) => (k.id === id ? { ...k, revokedAt: new Date().toISOString() } : k)));
  }

  function toggleEvent(ev) {
    setHookEvents((evs) => (evs.includes(ev) ? evs.filter((e) => e !== ev) : [...evs, ev]));
  }
  async function addHook() {
    if (!hookUrl.trim() || hookEvents.length === 0) return;
    const { webhook, secret } = await createWebhook(hookUrl.trim(), hookEvents);
    setHooks((hs) => [webhook, ...(hs || [])]);
    setFreshSecret(secret);
    setHookUrl(''); setHookEvents([]);
  }
  async function toggleHook(h) {
    const updated = await updateWebhook(h.id, { enabled: !h.enabled });
    setHooks((hs) => hs.map((x) => (x.id === h.id ? updated : x)));
  }
  async function removeHook(id) {
    await deleteWebhook(id);
    setHooks((hs) => hs.filter((h) => h.id !== id));
  }

  return (
    <section className="view">
      <div className="view-header">
        <div>
          <div className="view-title">API &amp; Webhooks</div>
          <div className="view-subtitle">Let other tools read and write your portfolio.</div>
        </div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14.5, marginBottom: 6 }}>API keys</h3>
        <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 12 }}>
          Use a key as <code>Authorization: Bearer &lt;key&gt;</code> against <code>/api/v1/projects</code> and <code>/api/v1/tasks</code>. A key is shown once, at creation — store it somewhere safe.
        </p>

        {freshKey && (
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--brand-500)', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
            <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginBottom: 4 }}>Your new key — copy it now, it won't be shown again:</div>
            <div className="flex items-center gap-8">
              <code style={{ flex: 1, fontSize: 12.5, wordBreak: 'break-all' }}>{freshKey}</code>
              <button className="btn btn-secondary btn-sm" onClick={() => { navigator.clipboard.writeText(freshKey); }}>Copy</button>
              <button className="btn-icon" onClick={() => setFreshKey(null)}><Icon name="i-x" className="icon icon-sm" /></button>
            </div>
          </div>
        )}

        <div className="flex gap-8" style={{ marginBottom: 14 }}>
          <input className="grow" value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="e.g. Zapier integration" style={{ border: '1px solid var(--border-strong)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '9px 11px', fontSize: 13 }} />
          <button className="btn btn-primary btn-sm" onClick={addKey}><Icon name="i-plus" className="icon icon-sm" />New key</button>
        </div>

        <div className="col gap-8">
          {keys?.map((k) => (
            <div key={k.id} className="flex items-center gap-10" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <code style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{k.keyPrefix}…</code>
              <div className="grow" style={{ fontSize: 13 }}>{k.name}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{k.lastUsedAt ? `last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : 'never used'}</div>
              {k.revokedAt ? <span className="pill pill-blocked">Revoked</span> : (
                <button className="btn-icon" title="Revoke" onClick={() => revoke(k.id)}><Icon name="i-trash" className="icon icon-sm" /></button>
              )}
            </div>
          ))}
          {keys?.length === 0 && <p style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>No API keys yet.</p>}
        </div>
      </div>

      <div className="card card-pad">
        <h3 style={{ fontSize: 14.5, marginBottom: 6 }}>Webhooks</h3>
        <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 12 }}>
          MujuzPM POSTs a signed JSON payload to your URL when a subscribed event happens, with an <code>X-MujuzPM-Signature</code> header (HMAC-SHA256 of the body, using the secret shown at creation).
        </p>

        {freshSecret && (
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--brand-500)', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
            <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginBottom: 4 }}>Signing secret — copy it now, it won't be shown again:</div>
            <div className="flex items-center gap-8">
              <code style={{ flex: 1, fontSize: 12.5, wordBreak: 'break-all' }}>{freshSecret}</code>
              <button className="btn btn-secondary btn-sm" onClick={() => { navigator.clipboard.writeText(freshSecret); }}>Copy</button>
              <button className="btn-icon" onClick={() => setFreshSecret(null)}><Icon name="i-x" className="icon icon-sm" /></button>
            </div>
          </div>
        )}

        <div className="col gap-8" style={{ marginBottom: 14 }}>
          <input value={hookUrl} onChange={(e) => setHookUrl(e.target.value)} placeholder="https://your-app.example.com/webhooks/mujuzpm" style={{ border: '1px solid var(--border-strong)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '9px 11px', fontSize: 13 }} />
          <div className="flex wrap gap-10">
            {EVENTS.map((ev) => (
              <label key={ev} className="flex items-center gap-6" style={{ fontSize: 12.5 }}>
                <input type="checkbox" checked={hookEvents.includes(ev)} onChange={() => toggleEvent(ev)} style={{ width: 'auto' }} /> {ev}
              </label>
            ))}
          </div>
          <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={addHook}><Icon name="i-plus" className="icon icon-sm" />Add webhook</button>
        </div>

        <div className="col gap-8">
          {hooks?.map((h) => (
            <div key={h.id} className="flex items-center gap-10" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div className={`switch${h.enabled ? ' on' : ''}`} onClick={() => toggleHook(h)}><i /></div>
              <div className="grow">
                <div style={{ fontSize: 13 }} className="truncate">{h.url}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{h.events.join(', ')}</div>
              </div>
              <button className="btn-icon" title="Delete" onClick={() => removeHook(h.id)}><Icon name="i-trash" className="icon icon-sm" /></button>
            </div>
          ))}
          {hooks?.length === 0 && <p style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>No webhooks yet.</p>}
        </div>
      </div>
    </section>
  );
}
