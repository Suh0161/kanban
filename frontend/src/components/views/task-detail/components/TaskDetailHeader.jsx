import { ArrowLeft, Trash2 } from 'lucide-react';

const PRIORITY_DOT = {
  Critical: 'var(--color-red)',
  High:     'var(--color-orange)',
  Medium:   'var(--color-yellow)',
  Low:      'var(--color-blue)',
};

export default function TaskDetailHeader({ task, columnTitle, onBack, onDelete, onUpdateTask, canEdit = true }) {
  return (
    <header className="task-detail-header">
      <div className="task-detail-header-top">
        <div className="task-detail-header-meta">
          <button type="button" className="task-detail-back" onClick={onBack}>
            <ArrowLeft size={13} /> Back
          </button>
          <span className="task-detail-divider" aria-hidden="true" />
          <span className="task-detail-code">{task.code}</span>
          {columnTitle && (
            <>
              <span className="task-detail-divider" aria-hidden="true" />
              <span className="task-detail-status-pill">
                <span
                  className="task-detail-priority-dot"
                  style={{ background: PRIORITY_DOT[task.priority] || 'var(--text-tertiary)' }}
                  title={`${task.priority || 'No'} priority`}
                  aria-hidden="true"
                />
                {columnTitle}
              </span>
            </>
          )}
        </div>

        {canEdit && (
          <div className="task-detail-header-actions">
            <button
              type="button"
              className="btn-icon-small danger-hover"
              onClick={() => onDelete(task.id)}
              title="Delete task"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      <input
        className="task-detail-title-input"
        value={task.title}
        onChange={e => onUpdateTask(task.id, { title: e.target.value })}
        placeholder="Untitled task"
        aria-label="Task title"
        disabled={!canEdit}
        readOnly={!canEdit}
      />
    </header>
  );
}
