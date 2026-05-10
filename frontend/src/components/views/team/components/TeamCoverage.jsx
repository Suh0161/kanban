import { AlertTriangle, Inbox, ShieldCheck, Tags } from 'lucide-react';

function coverageRows(tasks) {
  return [
    { label: 'Exploit response', count: tasks.filter(task => task.tags.includes('Exploit')).length },
    { label: 'Moderation queue', count: tasks.filter(task => task.tags.includes('Harassment')).length },
    { label: 'Leak watch', count: tasks.filter(task => task.tags.includes('Leak')).length },
    { label: 'Bug triage', count: tasks.filter(task => task.tags.includes('Bug')).length }
  ];
}

export default function TeamCoverage({ tasks, urgent, unassigned, onSelectTask }) {
  const rows = coverageRows(tasks);
  const urgentPreview = urgent.slice(0, 3);

  return (
    <aside className="team-rail">
      <section className="workspace-panel">
        <div className="workspace-panel-header compact">
          <h2>Coverage</h2>
          <ShieldCheck size={16} />
        </div>
        <div className="team-coverage-list">
          {rows.map(row => (
            <div key={row.label}>
              <Tags size={15} />
              <span>{row.label}</span>
              <strong>{row.count}</strong>
            </div>
          ))}
          <div>
            <Inbox size={15} />
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
          {urgentPreview.map(task => (
            <button key={task.id} type="button" onClick={() => onSelectTask(task)}>
              <span>{task.code}</span>
              <strong>{task.title}</strong>
              <em>{task.assigneeName || (task.assigneeImg ? 'Assigned' : 'Unassigned')}</em>
            </button>
          ))}
          {urgentPreview.length === 0 && (
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
