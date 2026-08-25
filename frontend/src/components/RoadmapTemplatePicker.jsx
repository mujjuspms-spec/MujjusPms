import { useEffect, useMemo, useState } from 'react';
import Icon from './Icon';
import TemplatePreviewModal from './TemplatePreviewModal';
import CreateTemplateModal from './CreateTemplateModal';
import { fetchRoadmapTemplates, deleteCustomTemplate } from '../services/roadmap';

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'fundraising', label: 'Fundraising' },
  { key: 'regulatory', label: 'Regulatory' },
  { key: 'clinical', label: 'Clinical' },
  { key: 'product', label: 'Product' },
  { key: 'commercial', label: 'Commercial' },
  { key: 'custom', label: 'Custom' },
];

// `onPick(key, phasesOverride?)` — phasesOverride is only present when the
// user reviewed the template in the preview modal and added phases/
// subtasks there before using it.
export default function RoadmapTemplatePicker({ selectedKey, onPick, actionLabel = 'Use this template', refreshKey }) {
  const [templates, setTemplates] = useState([]);
  const [category, setCategory] = useState('all');
  const [previewing, setPreviewing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [localRefresh, setLocalRefresh] = useState(0);

  useEffect(() => { fetchRoadmapTemplates().then(setTemplates); }, [refreshKey, localRefresh]);

  const filtered = useMemo(
    () => (category === 'all' ? templates : templates.filter((t) => t.category === category)),
    [templates, category],
  );

  async function removeCustom(e, key) {
    e.stopPropagation();
    if (!window.confirm('Delete this custom template? This does not affect any project already using it.')) return;
    await deleteCustomTemplate(key);
    setTemplates((ts) => ts.filter((t) => t.key !== key));
  }

  return (
    <div>
      <div className="flex items-center justify-between wrap gap-8" style={{ marginBottom: 12 }}>
        <div className="roadmap-filters" style={{ marginBottom: 0 }}>
          {CATEGORIES.map((c) => (
            <button
              key={c.key} type="button"
              className={`roadmap-chip${category === c.key ? ' active' : ''}`}
              onClick={() => setCategory(c.key)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCreating(true)}>
          <Icon name="i-plus" className="icon icon-sm" />New template
        </button>
      </div>
      <div className="roadmap-template-grid">
        {filtered.map((t) => {
          const isSelected = selectedKey === t.key;
          const subtaskCount = t.phases.reduce((s, p) => s + (p.subtasks?.length || 0), 0);
          return (
            <div key={t.key} className={`roadmap-template-card${isSelected ? ' selected' : ''}`}>
              <div className="flex items-center justify-between">
                <span className={`pill roadmap-cat-${t.category}`}>{t.category}</span>
                {t.custom && (
                  <button type="button" className="btn-icon" title="Delete this template" onClick={(e) => removeCustom(e, t.key)}>
                    <Icon name="i-trash" className="icon icon-sm" style={{ color: 'var(--ink-muted)' }} />
                  </button>
                )}
              </div>
              <div className="roadmap-template-name">{t.name}</div>
              <div className="roadmap-template-desc">{t.description}</div>
              <div className="roadmap-template-meta">{t.phases.length} phases · {subtaskCount} subtasks</div>
              <div className="flex gap-6">
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setPreviewing(t)}>
                  <Icon name="i-search" className="icon icon-sm" />View
                </button>
                <button type="button" className={`btn btn-sm grow ${isSelected ? 'btn-primary' : 'btn-secondary'}`} onClick={() => onPick(t.key)}>
                  {isSelected ? 'Selected ✓' : actionLabel}
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>No templates in this category yet.</p>
        )}
      </div>

      {previewing && (
        <TemplatePreviewModal
          template={previewing}
          actionLabel={actionLabel}
          onClose={() => setPreviewing(null)}
          onUse={(phases) => { onPick(previewing.key, phases); setPreviewing(null); }}
        />
      )}
      {creating && (
        <CreateTemplateModal
          onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); setLocalRefresh((n) => n + 1); }}
        />
      )}
    </div>
  );
}
