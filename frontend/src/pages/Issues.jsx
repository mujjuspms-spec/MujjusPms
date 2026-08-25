import IssueList from '../components/IssueList';

export default function Issues() {
  return (
    <section className="view">
      <div className="view-header">
        <div>
          <div className="view-title">Issues</div>
          <div className="view-subtitle">Bugs and defects across the portfolio — separate from planned task work.</div>
        </div>
      </div>
      <IssueList />
    </section>
  );
}
