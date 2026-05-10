import { Calendar, MessageSquare, Paperclip } from 'lucide-react';

function priorityClass(priority) {
  return `workspace-priority ${priority.toLowerCase()}`;
}

export default function ViewTaskRow({ task, columnTitle, onSelectTask }) {
  return (
    <button className="workspace-task-row" type="button" onClick={() => onSelectTask(task)}>
      <span className={`workspace-task-accent ${task.priority.toLowerCase()}`} />
      <div className="workspace-task-main">
        <div className="workspace-task-meta">
          <span>{task.code}</span>
          <span>{columnTitle}</span>
        </div>
        <strong>{task.title}</strong>
        <div className="workspace-task-tags">
          {task.tags.map(tag => <span key={tag}>{tag}</span>)}
        </div>
      </div>
      <div className="workspace-task-side">
        <span className={priorityClass(task.priority)}>{task.priority}</span>
        <span className="workspace-muted">
          <MessageSquare size={13} />
          {task.metrics.comments}
        </span>
        <span className="workspace-muted">
          <Paperclip size={13} />
          {task.metrics.attachments}
        </span>
      </div>
      <div className="workspace-task-owner">
        {task.assigneeImg ? <img src={task.assigneeImg} alt="" className="avatar" /> : <span className="workspace-avatar-empty" />}
        {task.dueDate && (
          <span>
            <Calendar size={13} />
            {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
    </button>
  );
}
