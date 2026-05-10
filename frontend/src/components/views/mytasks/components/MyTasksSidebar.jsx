import { AlertCircle, Clock3, MessageSquare, Target } from 'lucide-react';
import { formatDate } from '../../../../utils/helpers.js';

function topByComments(tasks) {
  return [...tasks].sort((a, b) => b.metrics.comments - a.metrics.comments).slice(0, 3);
}

export default function MyTasksSidebar({ assigned, urgent, overdue, watching, onSelectTask }) {
  const discussion = topByComments(watching.length ? watching : assigned);

  return (
    <aside className="mytasks-sidebar">
      <section className="workspace-panel">
        <div className="workspace-panel-header compact">
          <h2>Today focus</h2>
          <Target size={16} />
        </div>
        <div className="mytasks-focus-list">
          <div>
            <AlertCircle size={15} />
            <span>Urgent</span>
            <strong>{urgent.length}</strong>
          </div>
          <div>
            <Clock3 size={15} />
            <span>Overdue</span>
            <strong>{overdue.length}</strong>
          </div>
          <div>
            <MessageSquare size={15} />
            <span>Watching</span>
            <strong>{watching.length}</strong>
          </div>
        </div>
      </section>

      <section className="workspace-panel">
        <div className="workspace-panel-header">
          <div>
            <h2>Needs attention</h2>
            <span>Highest signal cards</span>
          </div>
          <span>{discussion.length}</span>
        </div>
        <div className="mytasks-review-list">
          {discussion.map(task => (
            <button key={task.id} type="button" onClick={() => onSelectTask(task)}>
              <span>{task.code}</span>
              <strong>{task.title}</strong>
              <em>{task.metrics.comments} comments</em>
            </button>
          ))}
        </div>
      </section>

      <section className="workspace-panel">
        <div className="workspace-panel-header compact">
          <h2>Upcoming due</h2>
          <Clock3 size={16} />
        </div>
        <div className="mytasks-due-list">
          {assigned.filter(task => task.dueDate).slice(0, 4).map(task => (
            <button key={task.id} type="button" onClick={() => onSelectTask(task)}>
              <span>{formatDate(task.dueDate)}</span>
              <strong>{task.title}</strong>
            </button>
          ))}
          {assigned.filter(task => task.dueDate).length === 0 && (
            <div className="workspace-empty-state">
              <strong>No due dates</strong>
              <span>Add dates to build a useful work plan.</span>
            </div>
          )}
        </div>
      </section>
    </aside>
  );
}
