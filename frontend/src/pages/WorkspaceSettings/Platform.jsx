import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import { SectionCard } from './shared';

export default function Platform() {
  const navigate = useNavigate();
  return (
    <SectionCard title="Integrations & API" description="Connect external tools and manage programmatic access.">
      <div className="col gap-8">
        <button className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => navigate('/settings/integrations')}>
          <Icon name="i-link" className="icon icon-sm" /> Integrations — Google Calendar, Slack, Anthropic &amp; more
        </button>
        <button className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => navigate('/settings/api')}>
          <Icon name="i-globe" className="icon icon-sm" /> API Keys &amp; Webhooks
        </button>
      </div>
      <p style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 12 }}>
        Note: API keys are personal (tied to your account) and integrations/webhooks are shared across the whole MujuzPM instance today — neither is workspace-scoped yet. That's a larger architectural change, not something this settings page changes.
      </p>
    </SectionCard>
  );
}
