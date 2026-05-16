import { Clock3 } from 'lucide-react';
import { formatDate, isOverdue } from '../../../../utils/helpers.js';

export default function MyTasksSidebar({ assigned, urgent, overdue, onSelectTask }) {
  // Upcoming: assigned tasks with due dates, sorted soonest first, not overdue
  const upcoming = assigned
    .filter(t => t.dueDate && !isOverdue(t.dueDate))
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 5);

  // Needs attention: overdue first, then urgent without due date
  const attention = [
    ...overdue.slice(0, 3),
    ...urgent.filter(t => !t.dueDate && !overdue.find(o => o.id === t.id)).slice(0, 2),
  ].slice(0, 4);

  return (
    <aside className="mytasks-sidebar">

      {/* Needs attention */}
      {attention.length > 0 && (
        <section className="workspace-panel">
          <div className="workspace-panel-header compact">
            <h2>Needs attention</h2>
            <span>{attention.length}</span>
          </div>
          <div className="mytasks-review-list">
            {attention.map(task => (
              <button key={task.id} type="button" onClick={() => onSelectTask(task)}>
                <span className="mytasks-review-code">{task.code}</span>
                <strong>{task.title}</strong>
                <em className={isOverdue(task.dueDate) ? 'overdue' : ''}>
                  {isOverdue(task.dueDate) ? `Overdue · ${formatDate(task.dueDate)}` : task.priority}
                </em>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming due */}
      <section className="workspace-panel">
        <div className="workspace-panel-header compact">
          <h2>Upcoming due</h2>
          <Clock3 size={15} />
        </div>
        <div className="mytasks-due-list">
          {upcoming.length > 0 ? upcoming.map(task => (
            <button key={task.id} type="button" onClick={() => onSelectTask(task)}>
              <span>{formatDate(task.dueDate)}</span>
              <strong>{task.title}</strong>
            </button>
          )) : (
            <div className="workspace-empty-state">
              <strong>No upcoming dates</strong>
              <span>Add due dates to build a useful work plan.</span>
            </div>
          )}
        </div>
      </section>

    </aside>
  );
}
