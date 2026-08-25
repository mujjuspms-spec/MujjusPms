import PortfolioTimeline from '../components/PortfolioTimeline';
import { useI18n } from '../hooks/useI18n';
import { useTasksStore } from '../hooks/useTasksStore';
import { PROJECTS } from '../services/projects';

export default function Timeline() {
  const { t } = useI18n();
  const { loading } = useTasksStore();

  return (
    <section className="view">
      <div className="view-header">
        <div>
          <div className="view-title">{t('nav.timeline')}</div>
          <div className="view-subtitle">When are our projects happening — real dates, progress and health at a glance.</div>
        </div>
      </div>
      <PortfolioTimeline projects={PROJECTS} loading={loading} />
    </section>
  );
}
