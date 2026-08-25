import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import Icon from '../components/Icon';
import Avatar from '../components/Avatar';
import { HealthLabel } from '../components/Pill';
import { useI18n } from '../hooks/useI18n';
import { useAuth } from '../hooks/useAuth';
import { useTasksStore } from '../hooks/useTasksStore';
import { PROJECTS } from '../services/projects';
import { PEOPLE } from '../services/people';
import { fetchNotifications } from '../services/notifications';
import { fetchAiStatus, fetchInsights } from '../services/ai';
import { reportsExportUrl } from '../services/reports';
import { money, STATUS_ORDER, STATUS_LABEL_KEY } from '../utils/format';
import { computeProjectBudgetTotals, computeAllProjectsBudgetTotals } from '../utils/budget';

const RANGE_DAYS = { week: 7, month: 30, quarter: 90 };
const STATUS_COLOR = {
  backlog: 'var(--ink-muted)', todo: 'var(--cat-1)', progress: 'var(--cat-2)',
  review: 'var(--cat-7)', done: 'var(--status-good)', blocked: 'var(--status-critical)',
};

export default function Dashboard() {
  const { t, L } = useI18n();
  const { user } = useAuth();
  const { tasks, tasksForProject } = useTasksStore();
  const navigate = useNavigate();
  const { openCopilot } = useOutletContext();
  const [recent, setRecent] = useState([]);
  const [aiConfigured, setAiConfigured] = useState(null);
  const [insights, setInsights] = useState(null);
  const [insightsError, setInsightsError] = useState(null);
  const [range, setRange] = useState('month');

  useEffect(() => { fetchNotifications().then((ns) => setRecent(ns.slice(0, 6))); }, []);

  useEffect(() => {
    fetchAiStatus().then((configured) => {
      setAiConfigured(configured);
      if (!configured) return;
      fetchInsights().then(setInsights).catch((e) => setInsightsError(e.message));
    });
  }, []);

  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(today); rangeEnd.setDate(rangeEnd.getDate() + RANGE_DAYS[range]);
    const overdue = tasks.filter((tk) => tk.status !== 'done' && !isNaN(Date.parse(tk.due)) && new Date(tk.due) < today);
    const dueInRange = tasks.filter((tk) => {
      if (tk.status === 'done' || isNaN(Date.parse(tk.due))) return false;
      const due = new Date(tk.due);
      return due >= today && due <= rangeEnd;
    });
    // Computed from each project's own tasks/subtasks — never the projects'
    // stored budget/spent columns, which is what left this permanently
    // disconnected from real task data.
    const portfolio = computeAllProjectsBudgetTotals(PROJECTS.map((p) => computeProjectBudgetTotals(tasksForProject(p.id), p.budget)));
    return {
      active: PROJECTS.length,
      dueInRange: dueInRange.length,
      overdue: overdue.length,
      budgetPct: portfolio.total > 0 ? portfolio.utilization : null,
      totalBudget: portfolio.total, totalSpent: portfolio.spent,
    };
  }, [tasks, range, tasksForProject]);

  const distribution = useMemo(() => {
    const counts = {};
    STATUS_ORDER.forEach((s) => { counts[s] = 0; });
    tasks.forEach((tk) => { if (counts[tk.status] !== undefined) counts[tk.status]++; });
    const total = tasks.length || 1;
    return STATUS_ORDER.map((s) => ({ status: s, pct: Math.round((counts[s] / total) * 100) }));
  }, [tasks]);

  const myTasks = tasks.filter((tk) => tk.assignee === user?.id && tk.status !== 'done').slice(0, 5);

  return (
    <section className="view">
      <div className="view-header">
        <div>
          <div className="view-title">{L(`Good afternoon, ${user?.name?.split(' ')[0] || ''} 👋`, `مساء الخير، ${user?.name || ''} 👋`)}</div>
          <div className="view-subtitle">{t('dash.sub')} · {L(new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }), new Date().toLocaleDateString('ar', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }))}</div>
        </div>
        <div className="flex gap-8">
          <select value={range} onChange={(e) => setRange(e.target.value)} className="btn btn-secondary btn-sm" style={{ paddingInlineEnd: 10 }}>
            <option value="week">This week</option>
            <option value="month">This month</option>
            <option value="quarter">This quarter</option>
          </select>
          <a className="btn btn-secondary btn-sm" href={reportsExportUrl()}><Icon name="i-download" className="icon icon-sm" />{t('dash.export')}</a>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-tile">
          <div className="s-label">{t('dash.stat.active')}</div>
          <div className="s-value tabular">{stats.active}</div>
          <div className="s-delta" style={{ color: 'var(--ink-secondary)' }}>across the portfolio</div>
        </div>
        <div className="stat-tile">
          <div className="s-label">Tasks due this {range}</div>
          <div className="s-value tabular">{stats.dueInRange}</div>
          <div className="s-delta" style={{ color: 'var(--ink-secondary)' }}>not yet done</div>
        </div>
        <div className="stat-tile">
          <div className="s-label">{t('dash.stat.overdue')}</div>
          <div className="s-value tabular" style={{ color: 'var(--status-critical)' }}>{stats.overdue}</div>
          <div className="flex items-center gap-6 health-critical" style={{ fontSize: 11.5, fontWeight: 700, marginTop: 6 }}>
            <Icon name="i-alert-t" className="icon icon-sm" /><span>{t('dash.stat.needsattention')}</span>
          </div>
        </div>
        <div className="stat-tile">
          <div className="s-label">{t('dash.stat.budget')}</div>
          <div className="s-value tabular">{stats.budgetPct != null ? `${stats.budgetPct}%` : '—'}</div>
          <div className="s-delta" style={{ color: 'var(--ink-secondary)' }}>
            <span className="tabular">{stats.totalBudget > 0 ? `${money(stats.totalSpent)} of ${money(stats.totalBudget)}` : 'No budget set yet'}</span>
          </div>
          <div className="meter" style={{ marginTop: 10 }}><span style={{ width: (stats.budgetPct ?? 0) + '%' }} /></div>
        </div>
      </div>

      <div className="two-col-layout" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, alignItems: 'start' }}>
        <div className="col gap-16">
          <div className="card card-pad">
            <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
              <h3 style={{ fontSize: 14.5 }}>{t('dash.health.title')}</h3>
              <a href="#" className="btn btn-ghost btn-sm" onClick={(e) => { e.preventDefault(); navigate('/projects'); }}>{t('dash.viewall')}</a>
            </div>
            <div className="col gap-16">
              {PROJECTS.map((p) => (
                <div key={p.id} className="flex items-center gap-12" style={{ cursor: 'pointer' }} onClick={() => navigate(`/projects/${p.id}`)}>
                  <div style={{ flex: '0 0 160px', fontSize: 13, fontWeight: 600 }} className="truncate">{p.name}</div>
                  <div className="meter grow"><span style={{ width: p.progress + '%' }} /></div>
                  <div style={{ flex: '0 0 40px', fontSize: 12, textAlign: 'end' }}>{p.progress}%</div>
                  <div style={{ flex: '0 0 90px' }}><HealthLabel health={p.health} /></div>
                </div>
              ))}
            </div>
          </div>

          <div className="card card-pad">
            <h3 style={{ fontSize: 14.5, marginBottom: 14 }}>{t('dash.dist.title')}</h3>
            <div className="flex" style={{ height: 26, borderRadius: 6, overflow: 'hidden', gap: 2 }}>
              {distribution.map((d) => <div key={d.status} style={{ flex: d.pct || 0.001, background: STATUS_COLOR[d.status] }} />)}
            </div>
            <div className="flex wrap gap-16" style={{ marginTop: 14 }}>
              {distribution.map((d) => (
                <span key={d.status} className={`pill pill-${d.status}`}><span className="dot" /><span>{t(STATUS_LABEL_KEY[d.status])}</span> · {d.pct}%</span>
              ))}
            </div>
          </div>

          <div className="card card-pad">
            <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
              <h3 style={{ fontSize: 14.5 }}>{t('dash.mytasks.title')}</h3>
              <span className="pill pill-todo">{myTasks.length} <span>{t('dash.mytasks.open')}</span></span>
            </div>
            <div className="col gap-10">
              {myTasks.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>Nothing on your plate today — nice.</div>}
              {myTasks.map((tk) => (
                <div key={tk.id} className="flex items-center gap-10" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span className={`prio-${tk.priority}`} style={{ fontSize: 10 }}>●</span>
                  <div className="grow truncate" style={{ fontSize: 13 }}>{tk.title}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{tk.due}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col gap-16">
          <div className="ai-card">
            <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
              <span className="ai-badge"><Icon name="i-sparkle" className="icon icon-sm" /> {t('dash.ai.badge')}</span>
            </div>
            <div className="col gap-12">
              {aiConfigured === null && <p style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>Checking Copilot status…</p>}
              {aiConfigured === false && (
                <p style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink-secondary)' }}>
                  Connect your own Anthropic API key in Settings to get live portfolio insights here instead of this placeholder.
                </p>
              )}
              {aiConfigured === true && insightsError && (
                <p style={{ fontSize: 12.5, color: 'var(--status-critical)' }}>{insightsError}</p>
              )}
              {aiConfigured === true && !insightsError && insights === null && (
                <p style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>Copilot is reading your portfolio…</p>
              )}
              {aiConfigured === true && insights?.map((ins, i) => (
                <p key={i} style={{ fontSize: 12.5, lineHeight: 1.55 }}>{ins}</p>
              ))}
            </div>
            <button
              className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: 12 }}
              onClick={() => (aiConfigured ? openCopilot() : navigate('/settings/integrations'))}
            >
              {aiConfigured ? t('dash.ai.more') : 'Connect Anthropic API key'}
            </button>
          </div>

          <div className="card card-pad">
            <h3 style={{ fontSize: 14.5, marginBottom: 12 }}>{t('dash.workload.title')}</h3>
            <div className="col gap-12">
              {PEOPLE.filter((p) => p.id !== user?.id).slice(0, 5).map((p) => {
                const pct = Math.round((p.allocated / p.capacity) * 100);
                const over = pct > 100;
                return (
                  <div key={p.id} className="flex items-center gap-10">
                    <Avatar person={p} size={26} />
                    <div className="grow">
                      <div className="flex justify-between" style={{ fontSize: 12, marginBottom: 3 }}>
                        <span className="truncate">{p.name}</span><span className="tabular">{p.allocated}/{p.capacity}h</span>
                      </div>
                      <div className="wtrack"><div className="wfill" style={{ width: Math.min(100, pct) + '%', background: over ? 'var(--status-critical)' : 'var(--brand-500)' }} /></div>
                    </div>
                  </div>
                );
              })}
            </div>
            <a href="#" className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 10 }} onClick={(e) => { e.preventDefault(); navigate('/workload'); }}>{t('dash.viewall')}</a>
          </div>

          <div className="card card-pad">
            <h3 style={{ fontSize: 14.5, marginBottom: 12 }}>{t('dash.activity.title')}</h3>
            <div className="col gap-14">
              {recent.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>No recent activity.</div>}
              {recent.map((a) => (
                <div key={a.id} className="flex items-start gap-10">
                  <Icon name={a.icon} className="icon icon-sm" style={{ color: a.color, marginTop: 2 }} />
                  <div style={{ fontSize: 12.5 }}>{a.text} <span style={{ color: 'var(--ink-muted)' }}>· {new Date(a.time).toLocaleString()}</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
