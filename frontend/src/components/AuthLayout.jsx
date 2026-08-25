import Icon from './Icon';
import { useI18n } from '../hooks/useI18n';

export default function AuthLayout({ children }) {
  const { t, lang, setLang } = useI18n();

  return (
    <div className="login-wrap">
      <div className="login-visual">
        <div className="pattern" />
        <div>
          <div className="flex items-center gap-10">
            <div className="brand-mark" style={{ background: 'rgba(255,255,255,.18)', backdropFilter: 'blur(4px)' }}>M</div>
            <span style={{ position: 'relative', fontFamily: 'var(--font-cursive)', fontWeight: 400, fontSize: 24, color: '#fff' }}>MujuzPM</span>
          </div>
          <div className="geo-badge" style={{ marginTop: 22 }}><Icon name="i-globe" className="icon icon-sm" /><span>{t('login.badge')}</span></div>
          <h1>{t('login.headline')}</h1>
          <p className="lead">{t('login.sub')}</p>
          <div className="login-stats">
            <div><b>8+</b><span>{t('login.stat1')}</span></div>
            <div><b>99.95%</b><span>{t('login.stat2')}</span></div>
            <div><b>AES-256</b><span>{t('login.stat3')}</span></div>
          </div>
        </div>
        <div className="login-quote">
          “<span>{t('login.quote')}</span>”
          <div style={{ marginTop: 10, fontWeight: 700, fontSize: 12.5 }}>— <span>{t('login.quoteauthor')}</span></div>
        </div>
      </div>

      <div className="login-form-side">
        <div className="login-top-bar">
          <div className="lang-toggle">
            <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
            <button className={lang === 'ar' ? 'active' : ''} onClick={() => setLang('ar')}>AR</button>
          </div>
        </div>
        <div className="login-box">
          <div className="brand-row" style={{ padding: '0 0 26px' }}>
            <div className="brand-mark">M</div>
            <div>
              <div className="brand-name">MujuzPM</div>
              <div className="brand-sub">{t('login.tagline')}</div>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
