import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Icon from '../components/Icon';
import AuthLayout from '../components/AuthLayout';
import { useI18n } from '../hooks/useI18n';
import { useAuth } from '../hooks/useAuth';
import { fetchSsoStatus } from '../services/integrations';

export default function Login() {
  const { t } = useI18n();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [sso, setSso] = useState({ google: false, microsoft: false });
  const [showForgotHint, setShowForgotHint] = useState(false);

  useEffect(() => { fetchSsoStatus().then(setSso).catch(() => {}); }, []);
  useEffect(() => {
    const ssoError = new URLSearchParams(window.location.search).get('ssoError');
    if (ssoError) setErr(`Sign-in didn't complete (${ssoError.replace(/_/g, ' ')}). Try again or use email.`);
  }, []);

  async function doLogin() {
    setBusy(true); setErr(null);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (e) {
      setErr(e.message === 'Invalid email or password' ? 'Incorrect email or password.' : e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      <h2 style={{ fontSize: 20, marginBottom: 4 }}>{t('login.welcome')}</h2>
      <p style={{ color: 'var(--ink-muted)', fontSize: 13, marginBottom: 20 }}>{t('login.welcomesub')}</p>

      <div className="auth-tabs">
        <button className={tab === 'email' ? 'active' : ''} onClick={() => setTab('email')}>{t('login.tab.email')}</button>
        <button className={tab === 'phone' ? 'active' : ''} onClick={() => setTab('phone')}>{t('login.tab.phone')}</button>
        <button className={tab === 'nafath' ? 'active' : ''} onClick={() => setTab('nafath')}>{t('login.tab.nafath')}</button>
      </div>

      {err && <div style={{ background: 'color-mix(in srgb, var(--status-critical) 12%, transparent)', color: 'var(--status-critical)', fontSize: 12.5, padding: '8px 11px', borderRadius: 8, marginBottom: 14 }}>{err}</div>}

      {tab === 'email' && (
        <div>
          <div className="field">
            <label>{t('login.email')}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label>{t('login.password')}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <label className="flex items-center gap-6" style={{ fontSize: 12.5, color: 'var(--ink-secondary)' }}>
              <input type="checkbox" defaultChecked style={{ width: 'auto' }} /> <span>{t('login.remember')}</span>
            </label>
            <button
              type="button" onClick={() => setShowForgotHint((v) => !v)}
              style={{ fontSize: 12.5, color: 'var(--brand-600)', fontWeight: 600, background: 'none', border: 0, cursor: 'pointer', padding: 0 }}
            >
              {t('login.forgot')}
            </button>
          </div>
          {showForgotHint && (
            <p style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: -10, marginBottom: 14 }}>
              There's no self-service reset yet — ask your workspace Admin to reset your password for you from the Team page.
            </p>
          )}
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy} onClick={doLogin}>{busy ? '…' : t('login.signin')}</button>
          <div className="oauth-row">
            <button
              className="btn btn-secondary oauth-btn" disabled={busy || !sso.google}
              title={sso.google ? undefined : 'Ask your workspace admin to connect Google sign-in in Settings → Integrations'}
              onClick={() => { window.location.href = '/api/auth/sso/google/start'; }}
            >
              <Icon name="i-mail" className="icon icon-sm" /> Google
            </button>
            <button
              className="btn btn-secondary oauth-btn" disabled={busy || !sso.microsoft}
              title={sso.microsoft ? undefined : 'Ask your workspace admin to connect Microsoft sign-in in Settings → Integrations'}
              onClick={() => { window.location.href = '/api/auth/sso/microsoft/start'; }}
            >
              <Icon name="i-grid" className="icon icon-sm" /> Microsoft
            </button>
          </div>
          {!sso.google && !sso.microsoft && (
            <p style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 8, textAlign: 'center' }}>Google/Microsoft sign-in isn't connected for this workspace yet — an admin can turn it on in Settings → Integrations.</p>
          )}
        </div>
      )}

      {tab === 'phone' && (
        <div>
          <div className="field">
            <label>{t('login.phone')}</label>
            <div className="phone-input">
              <span className="phone-code">🇸🇦 +966</span>
              <input type="tel" placeholder="5X XXX XXXX" disabled />
            </div>
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} disabled>{t('login.sendotp')}</button>
          <p style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 8, textAlign: 'center' }}>Phone sign-in needs an SMS provider to send real codes — coming soon. Use email or SSO for now.</p>
        </div>
      )}

      {tab === 'nafath' && (
        <div>
          <div className="nafath-box" style={{ opacity: 0.6, cursor: 'not-allowed' }}>
            <div className="nafath-icon"><Icon name="i-id" /></div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{t('login.nafath.title')}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{t('login.nafath.sub')}</div>
            </div>
            <Icon name="i-chevron-end" style={{ marginInlineStart: 'auto', color: 'var(--ink-muted)' }} />
          </div>
          <p style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 12, lineHeight: 1.6 }}>Nafath verification needs government API access this workspace hasn't set up yet — coming soon. Use email or SSO for now.</p>
        </div>
      )}

      <div className="divider">{t('login.or')}</div>
      <p className="auth-alt-link">
        <span>{t('login.noaccount')}</span> <Link to="/signup">{t('login.create')}</Link>
      </p>
    </AuthLayout>
  );
}
