import { ArrowLeft, Trash2 } from 'lucide-react';
import useDebouncedCommit from '../../../../hooks/useDebouncedCommit.js';
import { Tooltip } from '../../../ui';

const PRIORITY_DOT = {
  Critical: 'var(--color-red)',
  High:     'var(--color-orange)',
  Medium:   'var(--color-yellow)',
  Low:      'var(--color-blue)',
};

export default function TaskDetailHeader({ task, columnTitle, onBack, onDelete, onUpdateTask, canEdit = true }) {
  // Local state so every keystroke doesn't fire a PATCH + re-render the
  // whole board. Commits after 400ms idle or on blur.
  const { localValue: titleValue, onChange: onTitleChange, onBlur: onTitleBlur } = useDebouncedCommit({
    value: task.title,
    onCommit: next => onUpdateTask(task.id, { title: next }),
    delay: 400,
  });

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
                <Tooltip content={`${task.priority || 'No'} priority`}>
                  <span
                    className="task-detail-priority-dot"
                    style={{ background: PRIORITY_DOT[task.priority] || 'var(--text-tertiary)' }}
                    aria-hidden="true"
                  />
                </Tooltip>
                {columnTitle}
              </span>
            </>
          )}
        </div>

        {canEdit && (
          <div className="task-detail-header-actions">
            <Tooltip content="Delete task">
              <button
                type="button"
                className="btn-icon-small danger-hover"
                onClick={() => onDelete(task.id)}
                aria-label="Delete task"
              >
                <Trash2 size={16} />
              </button>
            </Tooltip>
          </div>
        )}
      </div>

      <input
        className="task-detail-title-input"
        value={titleValue}
        onChange={onTitleChange}
        onBlur={onTitleBlur}
        placeholder="Untitled task"
        aria-label="Task title"
        disabled={!canEdit}
        readOnly={!canEdit}
      />
    </header>
  );
}
