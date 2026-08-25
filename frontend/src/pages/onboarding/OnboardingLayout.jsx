export default function OnboardingLayout({ step, totalSteps, title, subtitle, children }) {
  return (
    <div className="onboard-wrap">
      <div className="onboard-box">
        <div className="brand-row" style={{ padding: '0 0 22px' }}>
          <div className="brand-mark">M</div>
          <div>
            <div className="brand-name">MujuzPM</div>
            {step && <div className="brand-sub">Step {step} of {totalSteps}</div>}
          </div>
        </div>
        <h2 style={{ fontSize: 20, marginBottom: 4 }}>{title}</h2>
        {subtitle && <p style={{ color: 'var(--ink-muted)', fontSize: 13, marginBottom: 22 }}>{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
