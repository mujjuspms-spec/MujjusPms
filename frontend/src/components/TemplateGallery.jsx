import { useEffect, useMemo, useState } from 'react';
import Icon from './Icon';
import { fetchTemplates, CATEGORY_LABEL, CATEGORY_ORDER, categoryColor } from '../services/projectTemplates';
import { useWorkspace } from '../hooks/useWorkspace';

function recommendedCategories(workspaceId) {
  try {
    const raw = localStorage.getItem(`mujuz-work-prefs-${workspaceId}`);
    if (!raw) return [];
    const { useCase = [] } = JSON.parse(raw);
    // Work-preference labels captured during onboarding aren't the same
    // strings as category keys — map the ones with an obvious match.
    const map = {
      'Software Development': 'SOFTWARE_DEVELOPMENT', 'Product Management': 'PRODUCT_MANAGEMENT',
      Marketing: 'MARKETING', Operations: 'OPERATIONS', Research: 'RESEARCH_AND_DEVELOPMENT', Consulting: 'CONSULTING',
    };
    return useCase.map((u) => map[u]).filter(Boolean);
  } catch { return []; }
}

export default function TemplateGallery({ onPick }) {
  const { activeWorkspace } = useWorkspace();
  const [templates, setTemplates] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [mineOnly, setMineOnly] = useState(false);

  useEffect(() => { fetchTemplates().then(setTemplates); }, []);

  const recCats = useMemo(() => recommendedCategories(activeWorkspace?.id), [activeWorkspace?.id]);

  const filtered = useMemo(() => {
    if (!templates) return null;
    const q = search.trim().toLowerCase();
    return templates.filter((t) => {
      if (mineOnly && t.isSystemTemplate) return false;
      if (category !== 'all' && t.category !== category) return false;
      if (!q) return true;
      return t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
        || t.category.toLowerCase().includes(q) || t.tags.some((tag) => tag.toLowerCase().includes(q));
    });
  }, [templates, search, category, mineOnly]);

  const featured = (templates || []).filter((t) => t.featured);
  const recommended = (templates || []).filter((t) => recCats.includes(t.category)).slice(0, 4);

  function Card({ t }) {
    return (
      <div className="roadmap-template-card" style={{ padding: 14 }}>
        <div className="flex items-center gap-8">
          <Icon name={t.icon} className="icon icon-sm" style={{ color: categoryColor(t.category) }} />
          <div className="roadmap-template-name" style={{ fontSize: 13.5 }}>{t.name}</div>
        </div>
        <div className="roadmap-template-desc" style={{ fontSize: 12, WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.description}</div>
        <span className="pill" style={{ background: `color-mix(in srgb, ${categoryColor(t.category)} 16%, transparent)`, color: categoryColor(t.category), width: 'fit-content' }}>
          {CATEGORY_LABEL[t.category] || t.category}
        </span>
        <div className="roadmap-template-meta">{t.phaseCount} phases · {t.taskCount} tasks{t.customFieldCount ? ` · ${t.customFieldCount} fields` : ''}</div>
        <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={() => onPick(t)}>Preview</button>
      </div>
    );
  }

  return (
    <div>
      <div className="field">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search templates…" />
      </div>

      {!search.trim() && category === 'all' && !mineOnly && recommended.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-secondary)', marginBottom: 8 }}>Recommended for you</div>
          <div className="roadmap-template-grid">{recommended.map((t) => <Card key={t.id} t={t} />)}</div>
        </div>
      )}
      {!search.trim() && category === 'all' && !mineOnly && featured.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-secondary)', marginBottom: 8 }}>Featured</div>
          <div className="roadmap-template-grid">{featured.map((t) => <Card key={t.id} t={t} />)}</div>
        </div>
      )}

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-secondary)', marginBottom: 8 }}>Browse categories</div>
      <div className="roadmap-filters">
        <button className={`roadmap-chip${category === 'all' ? ' active' : ''}`} onClick={() => setCategory('all')}>All</button>
        {CATEGORY_ORDER.map((c) => (
          <button key={c} className={`roadmap-chip${category === c ? ' active' : ''}`} onClick={() => setCategory(c)}>{CATEGORY_LABEL[c]}</button>
        ))}
        <button className={`roadmap-chip${mineOnly ? ' active' : ''}`} onClick={() => setMineOnly((v) => !v)}>My Templates</button>
      </div>

      {filtered === null ? (
        <p style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>Loading templates…</p>
      ) : filtered.length === 0 ? (
        <div className="card card-pad" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>No templates found.</p>
          <p style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Try another search or start with a blank project.</p>
        </div>
      ) : (
        <div className="roadmap-template-grid">{filtered.map((t) => <Card key={t.id} t={t} />)}</div>
      )}
    </div>
  );
}
