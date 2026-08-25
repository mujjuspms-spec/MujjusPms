import { useI18n } from '../hooks/useI18n';
import { STATUS_LABEL_KEY } from '../utils/format';

export default function Pill({ status, suffix }) {
  const { t } = useI18n();
  return (
    <span className={`pill pill-${status}`}>
      <span className="dot" /><span>{t(STATUS_LABEL_KEY[status] || status)}</span>{suffix}
    </span>
  );
}

// Single source of truth for project health display — icon+text+class+color
// — so no other file re-declares its own health→label/color map.
export const HEALTH_META = {
  good: { icon: 'i-check-c', text: 'On track', cls: 'health-good', color: 'var(--status-good)' },
  warning: { icon: 'i-alert-t', text: 'At risk', cls: 'health-warning', color: 'var(--status-warning)' },
  critical: { icon: 'i-alert-c', text: 'Critical', cls: 'health-critical', color: 'var(--status-critical)' },
};

export function HealthLabel({ health }) {
  const m = HEALTH_META[health] || HEALTH_META.good;
  return (
    <span className={`flex items-center gap-6 ${m.cls}`} style={{ fontSize: 11.5, fontWeight: 700 }}>
      <svg className="icon icon-sm"><use href={`#${m.icon}`} /></svg>{m.text}
    </span>
  );
}
