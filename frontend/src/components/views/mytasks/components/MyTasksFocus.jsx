import { CalendarDays } from 'lucide-react';
import { formatDate, isOverdue } from '../../../../utils/helpers.js';

export default function MyTasksFocus({ assigned, onSelectTask }) {
  // Show up to 6 tasks with due dates, sorted soonest first
  const focused = [...assigned]
    .filter(t => t.dueDate)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 6);

  if (focused.length === 0) return null;

  return (
    <section className="workspace-panel mytasks-focus-plan">
      <div className="workspace-panel-header compact">
        <h2>Focus plan</h2>
        <CalendarDays size={15} />
      </div>
      <div className="mytasks-timeline">
        {focused.map(task => {
          const overdue = isOverdue(task.dueDate);
          return (
            <button
              key={task.id}
              type="button"
              className={`mytasks-timeline-card ${overdue ? 'is-overdue' : ''}`}
              onClick={() => onSelectTask(task)}
            >
              <span className={`mytasks-timeline-date ${overdue ? 'overdue' : ''}`}>
                {formatDate(task.dueDate)}
              </span>
              <strong>{task.title}</strong>
              <em>{task.columnTitle} · {task.priority}</em>
            </button>
          );
        })}
      </div>
    </section>
  );
}
