import { AlertTriangle, Inbox, ShieldCheck, Tag } from 'lucide-react';

function buildTagCoverage(tasks) {
  const counts = new Map();
  for (const task of tasks) {
    for (const tag of task.tags || []) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  // Top 5 most used tags
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({ label, count }));
}

export default function TeamCoverage({ tasks, urgent, unassigned, onSelectTask }) {
  const rows = buildTagCoverage(tasks);
  const urgentPreview = urgent.slice(0, 4);

  return (
    <aside className="team-rail">
      <section className="workspace-panel">
        <div className="workspace-panel-header compact">
          <h2>Tag coverage</h2>
          <ShieldCheck size={16} />
        </div>
        <div className="team-coverage-list">
          {rows.length > 0 ? rows.map(row => (
            <div key={row.label}>
              <Tag size={14} />
              <span>{row.label}</span>
              <strong>{row.count}</strong>
            </div>
          )) : (
            <div className="workspace-empty-state">
              <strong>No tags yet</strong>
              <span>Add tags to tasks to see coverage breakdown.</span>
            </div>
          )}
          <div>
            <Inbox size={14} />
            <span>Unassigned</span>
            <strong>{unassigned.length}</strong>
          </div>
        </div>
      </section>

      <section className="workspace-panel">
        <div className="workspace-panel-header">
          <div>
            <h2>Escalations</h2>
            <span>Urgent work needing coverage</span>
          </div>
          <AlertTriangle size={16} />
        </div>
        <div className="team-escalation-list">
          {urgentPreview.length > 0 ? urgentPreview.map(task => (
            <button key={task.id} type="button" onClick={() => onSelectTask(task)}>
              <span>{task.code}</span>
              <strong>{task.title}</strong>
              <em>{task.assigneeName || 'Unassigned'}</em>
            </button>
          )) : (
            <div className="workspace-empty-state">
              <strong>No urgent escalations</strong>
              <span>The board has no high or critical active cards.</span>
            </div>
          )}
        </div>
      </section>
    </aside>
  );
}
