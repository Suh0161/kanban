import { formatDate, isOverdue } from '../../../../utils/helpers.js';

export default function AnalyticsRiskList({ tasks, onSelectTask, overdueCount, scheduledCount, icon: Icon }) {
  return (
    <aside className="analytics-rail">
      <section className="workspace-panel">
        <div className="workspace-panel-header compact">
          <h2>Schedule risk</h2>
          <Icon size={16} />
        </div>
        <div className="analytics-risk-summary">
          <div><span>Overdue</span><strong>{overdueCount}</strong></div>
          <div><span>Scheduled</span><strong>{scheduledCount}</strong></div>
        </div>
      </section>

      <section className="workspace-panel">
        <div className="workspace-panel-header">
          <div>
            <h2>Hot cards</h2>
            <span>Highest operational risk</span>
          </div>
          <span>{tasks.length}</span>
        </div>
        <div className="analytics-risk-list">
          {tasks.map(task => (
            <button key={task.id} type="button" onClick={() => onSelectTask(task)}>
              <span>{task.code}</span>
              <strong>{task.title}</strong>
              <em className={isOverdue(task.dueDate) ? 'danger' : ''}>{task.dueDate ? formatDate(task.dueDate) : 'No due date'}</em>
            </button>
          ))}
          {tasks.length === 0 && (
            <div className="workspace-empty-state">
              <strong>No active risk</strong>
              <span>Cards will appear here as the board fills up.</span>
            </div>
          )}
        </div>
      </section>
    </aside>
  );
}
