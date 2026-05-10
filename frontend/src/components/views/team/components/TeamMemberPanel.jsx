import { Clock3, MessageSquare } from 'lucide-react';
import { formatDate, isOverdue } from '../../../../utils/helpers.js';

export default function TeamMemberPanel({ member, unassigned, onSelectTask }) {
  const tasks = member?.owned?.length ? member.owned : unassigned;
  const title = member?.owned?.length ? `${member.name}'s queue` : 'Unassigned queue';

  return (
    <section className="workspace-panel team-member-panel">
      <div className="workspace-panel-header">
        <div>
          <h2>{title}</h2>
          <span>{member?.owned?.length ? member.status : 'Needs assignment'}</span>
        </div>
        <span>{tasks.length} cards</span>
      </div>
      <div className="team-task-list">
        {tasks.slice(0, 6).map(task => (
          <button key={task.id} type="button" onClick={() => onSelectTask(task)}>
            <span className={`workspace-task-accent ${task.priority.toLowerCase()}`} />
            <div>
              <span>{task.code}</span>
              <strong>{task.title}</strong>
            </div>
            <em className={isOverdue(task.dueDate) ? 'danger' : ''}>
              <Clock3 size={13} />
              {task.dueDate ? formatDate(task.dueDate) : 'No date'}
            </em>
            <em>
              <MessageSquare size={13} />
              {task.metrics.comments || 0}
            </em>
          </button>
        ))}
        {tasks.length === 0 && (
          <div className="workspace-empty-state">
            <strong>No assigned cards</strong>
            <span>Select another teammate or create a new issue.</span>
          </div>
        )}
      </div>
    </section>
  );
}
