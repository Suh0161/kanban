import { Activity, Calendar, Clock3, MessageSquare, ShieldAlert, TrendingUp } from 'lucide-react';

export default function AnalyticsView({ tasks }) {
  const totals = {
    open: tasks.length,
    critical: tasks.filter(task => task.priority === 'Critical').length,
    comments: tasks.reduce((sum, task) => sum + task.metrics.comments, 0),
    due: tasks.filter(task => task.dueDate).length
  };
  const priorities = ['Critical', 'High', 'Medium', 'Low'].map(priority => ({
    priority,
    count: tasks.filter(task => task.priority === priority).length
  }));
  const columns = ['Inbox', 'Triage', 'Investigating'].map(title => ({
    title,
    count: tasks.filter(task => task.columnTitle === title).length
  }));

  return (
    <section className="workspace-view analytics-view">
      <div className="workspace-page">
        <div className="workspace-page-header">
          <div>
            <span className="workspace-kicker">Reporting</span>
            <h1>Analytics</h1>
          </div>
          <div className="workspace-segmented" aria-label="Analytics range">
            <button type="button" className="active">7 days</button>
            <button type="button">30 days</button>
            <button type="button">Quarter</button>
          </div>
        </div>

        <div className="workspace-stats">
          <div className="workspace-stat"><ShieldAlert size={18} /><span>Open issues</span><strong>{totals.open}</strong><em>+2 this week</em></div>
          <div className="workspace-stat"><Clock3 size={18} /><span>Critical</span><strong>{totals.critical}</strong><em>Needs owner</em></div>
          <div className="workspace-stat"><MessageSquare size={18} /><span>Comments</span><strong>{totals.comments}</strong><em>Across active work</em></div>
          <div className="workspace-stat"><Calendar size={18} /><span>Due dates</span><strong>{totals.due}</strong><em>Scheduled</em></div>
        </div>

        <div className="workspace-analytics-grid">
          <div className="workspace-panel chart">
            <div className="workspace-panel-header">
              <div>
                <h2>Priority mix</h2>
                <span>Current active issue distribution</span>
              </div>
              <TrendingUp size={16} />
            </div>
            <div className="workspace-bars">
              {priorities.map(({ priority, count }) => (
                <div className="workspace-bar-row" key={priority}>
                  <span>{priority}</span>
                  <div className="workspace-bar-track">
                    <div className={`workspace-bar-fill ${priority.toLowerCase()}`} style={{ width: `${Math.max(count * 28, 8)}%` }} />
                  </div>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="workspace-panel flow">
            <div className="workspace-panel-header">
              <div>
                <h2>Board flow</h2>
                <span>Where active work is sitting</span>
              </div>
              <Activity size={16} />
            </div>
            <div className="workspace-flow-list">
              {columns.map(column => (
                <div key={column.title}>
                  <span>{column.title}</span>
                  <strong>{column.count}</strong>
                  <div><span style={{ width: `${Math.max(column.count * 28, 12)}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
