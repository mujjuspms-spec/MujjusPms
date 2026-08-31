import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import Icon from '../components/Icon';
import AuthLayout from '../components/AuthLayout';
import { useI18n } from '../hooks/useI18n';
import { useAuth } from '../hooks/useAuth';
import { fetchSsoStatus } from '../services/integrations';
import { peekInvitation } from '../services/workspaces';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Signup() {
  const { t } = useI18n();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrs, setFieldErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [sso, setSso] = useState({ google: false, microsoft: false });
  const [invite, setInvite] = useState(null); // { email, workspaceName, projectName, role, expired } | null
  const [inviteChecked, setInviteChecked] = useState(!inviteToken);
  const [confirmSent, setConfirmSent] = useState(false);

  useEffect(() => { fetchSsoStatus().then(setSso).catch(() => {}); }, []);

  useEffect(() => {
    if (!inviteToken) return;
    peekInvitation(inviteToken)
      .then((inv) => { setInvite(inv); if (!inv.expired) setEmail(inv.email); })
      .catch(() => setInvite({ expired: true }))
      .finally(() => setInviteChecked(true));
  }, [inviteToken]);

  function validate() {
    const fe = {};
    if (!name.trim()) fe.name = t('signup.err.name');
    if (!email.trim() || !EMAIL_RE.test(email.trim())) fe.email = t('signup.err.email');
    if (password.length < 8) fe.password = t('signup.err.password');
    if (confirm !== password) fe.confirm = t('signup.err.mismatch');
    setFieldErrs(fe);
    return Object.keys(fe).length === 0;
  }

  async function doSignup() {
    setErr(null);
    if (!validate()) return;
    setBusy(true);
    try {
      await register(name.trim(), email.trim().toLowerCase(), password, inviteToken || null);
      if (inviteToken) {
        // Supabase email confirmation means there's no session yet — the
        // invitation is only linked and accepted once they confirm and
        // first log in (see auth.js's auto-provision block).
        setConfirmSent(true);
      } else {
        navigate('/dashboard');
      }
    } catch (e) {
      setErr(e.message === 'An account with this email already exists' ? 'signup.duplicate' : e.message);
    } finally {
      setBusy(false);
    }
  }

  if (confirmSent) {
    return (
      <AuthLayout>
        <h2 style={{ fontSize: 20, marginBottom: 4 }}>Check your email</h2>
        <p style={{ color: 'var(--ink-muted)', fontSize: 13, marginBottom: 20 }}>
          We sent a confirmation link to <b>{email}</b>. Once confirmed, you'll be added to {invite?.projectName || invite?.workspaceName} automatically.
        </p>
        <p className="auth-alt-link"><Link to="/login">{t('signup.signin')}</Link></p>
      </AuthLayout>
    );
  }

  const inviteLocked = inviteToken && invite && !invite.expired;
  const inviteInvalid = inviteToken && inviteChecked && (!invite || invite.expired);

  return (
    <AuthLayout>
      <h2 style={{ fontSize: 20, marginBottom: 4 }}>{t('signup.title')}</h2>
      <p style={{ color: 'var(--ink-muted)', fontSize: 13, marginBottom: 20 }}>{t('signup.sub')}</p>

      {inviteLocked && (
        <div style={{ background: 'color-mix(in srgb, var(--brand-500) 10%, transparent)', color: 'var(--ink-secondary)', fontSize: 12.5, padding: '10px 12px', borderRadius: 8, marginBottom: 16 }}>
          You've been invited to join <b>{invite.workspaceName}</b>{invite.projectName ? <> — the <b>{invite.projectName}</b> project</> : ''} as <b>{invite.role}</b>.
        </div>
      )}
      {inviteInvalid && (
        <div style={{ background: 'color-mix(in srgb, var(--status-critical) 12%, transparent)', color: 'var(--status-critical)', fontSize: 12.5, padding: '8px 11px', borderRadius: 8, marginBottom: 14 }}>
          This invitation has expired or is no longer valid. <Link to="/login" style={{ color: 'inherit', fontWeight: 700, textDecoration: 'underline' }}>Sign in</Link> if you already have an account.
        </div>
      )}

      {err && (
        <div style={{ background: 'color-mix(in srgb, var(--status-critical) 12%, transparent)', color: 'var(--status-critical)', fontSize: 12.5, padding: '8px 11px', borderRadius: 8, marginBottom: 14 }}>
          {err === 'signup.duplicate' ? (
            <>{t('signup.err.duplicate')} <Link to="/login" style={{ color: 'inherit', fontWeight: 700, textDecoration: 'underline' }}>{t('signup.err.duplicatelink')}</Link></>
          ) : err}
        </div>
      )}

      <div className="field">
        <label>{t('signup.name')}</label>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        {fieldErrs.name && <div className="field-err">{fieldErrs.name}</div>}
      </div>
      <div className="field">
        <label>{t('signup.email')}</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={inviteLocked} />
        {fieldErrs.email && <div className="field-err">{fieldErrs.email}</div>}
      </div>
      <div className="field">
        <label>{t('signup.password')}</label>
        <div className="pwd-field">
          <input type={showPwd ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="button" className="pwd-toggle" aria-label={showPwd ? 'Hide password' : 'Show password'} aria-pressed={showPwd} onClick={() => setShowPwd((v) => !v)}>
            <Icon name={showPwd ? 'i-eye-off' : 'i-eye'} className="icon icon-sm" />
          </button>
        </div>
        {fieldErrs.password ? <div className="field-err">{fieldErrs.password}</div> : <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 5 }}>{t('signup.pwdhint')}</div>}
      </div>
      <div className="field">
        <label>{t('signup.confirm')}</label>
        <div className="pwd-field">
          <input type={showConfirm ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <button type="button" className="pwd-toggle" aria-label={showConfirm ? 'Hide password' : 'Show password'} aria-pressed={showConfirm} onClick={() => setShowConfirm((v) => !v)}>
            <Icon name={showConfirm ? 'i-eye-off' : 'i-eye'} className="icon icon-sm" />
          </button>
        </div>
        {fieldErrs.confirm && <div className="field-err">{fieldErrs.confirm}</div>}
      </div>

      <button className="btn btn-primary" style={{ width: '100%', marginTop: 4 }} disabled={busy} onClick={doSignup}>
        {busy ? t('signup.creating') : t('signup.create')}
      </button>

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

      <div className="divider">{t('login.or')}</div>
      <p className="auth-alt-link">
        <span>{t('signup.havelogin')}</span> <Link to="/login">{t('signup.signin')}</Link>
      </p>
    </AuthLayout>
  );
}
