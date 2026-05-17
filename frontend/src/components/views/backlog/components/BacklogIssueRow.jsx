import { CheckCircle2, CircleAlert, MessageSquare, Paperclip, Plus, TriangleAlert, X } from 'lucide-react';
import Select from '../../../ui/Select.jsx';
import { PRIORITIES } from '../../../../constants.js';
import { isOverdue } from '../backlogUtils.js';

const priorityOptions = PRIORITIES.map(p => ({ value: p, label: p }));

function formatDueDate(date) {
  if (!date) return null;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function BacklogIssueRow({ task, columns, columnOrder, onSelectTask, onMoveTask, onUpdateTask, canEdit = true }) {
  const columnOptions = columnOrder
    .map(id => columns[id])
    .filter(Boolean)
    .map(col => ({ value: col.id, label: col.title }));

  const missing = [
    !task.assigneeImg ? 'owner' : null,
    !task.dueDate ? 'date' : null,
    task.columnTitle === 'Inbox' ? 'triage' : null,
  ].filter(Boolean);

  const ready = missing.length === 0;
  const inSprint = task.sprintId === 'next-sprint';
  const overdue = isOverdue(task);
  const formattedDue = formatDueDate(task.dueDate);

  const toggleSprint = () => {
    onUpdateTask(task.id, { sprintId: inSprint ? null : 'next-sprint' });
  };

  return (
    <article className={`backlog-issue-row ${overdue ? 'is-overdue' : ''} ${!canEdit ? 'is-readonly' : ''}`}>
      <span className={`backlog-issue-accent ${task.priority.toLowerCase()}`} />

      {/* Main info */}
      <div className="backlog-issue-main">
        <div className="backlog-issue-meta-top">
          <span className="backlog-code">{task.code}</span>
          <span className="backlog-col-name">{task.columnTitle}</span>
          {task.tags.length > 0 && task.tags.map(tag => (
            <span key={tag} className="backlog-tag">{tag}</span>
          ))}
        </div>
        <button type="button" className="backlog-issue-title" onClick={() => onSelectTask(task)}>
          {task.title}
        </button>
        <div className="backlog-readiness">
          <span className={inSprint ? 'planned' : ready ? 'ready' : 'grooming'}>
            {inSprint
              ? <><CheckCircle2 size={12} /> Sprint draft</>
              : ready
                ? <><CheckCircle2 size={12} /> Ready</>
                : <><CircleAlert size={12} /> Needs grooming</>
            }
          </span>
          {overdue && (
            <span className="overdue-badge">
              <TriangleAlert size={12} /> Overdue
            </span>
          )}
          {!ready && missing.map(item => <em key={item}>Missing {item}</em>)}
        </div>
      </div>

      {/* Priority */}
      {canEdit && (
        <div className="backlog-field">
          <span>Priority</span>
          <Select
            value={task.priority}
            options={priorityOptions}
            className="backlog-select"
            onChange={value => onUpdateTask(task.id, { priority: value })}
          />
        </div>
      )}

      {/* Status / column */}
      {canEdit && (
        <div className="backlog-field">
          <span>Status</span>
          <Select
            value={task.columnId}
            options={columnOptions}
            className="backlog-select"
            onChange={value => onMoveTask(task.id, value)}
          />
        </div>
      )}

      {/* Due date */}
      {canEdit && (
        <label className="backlog-field">
          <span>Due date</span>
          <input
            type="date"
            value={task.dueDate || ''}
            onChange={e => onUpdateTask(task.id, { dueDate: e.target.value || null })}
            aria-label={`${task.code} due date`}
            className={overdue ? 'overdue-input' : ''}
          />
        </label>
      )}

      {/* Metrics + assignee + plan */}
      <div className="backlog-issue-actions">
        <div className="backlog-metrics">
          {formattedDue && (
            <span className={`backlog-due ${overdue ? 'overdue' : ''}`}>{formattedDue}</span>
          )}
          <span className="backlog-metric">
            <MessageSquare size={12} />
            {task.metrics.comments}
          </span>
          <span className="backlog-metric">
            <Paperclip size={12} />
            {task.metrics.attachments}
          </span>
        </div>
        <div className="backlog-row-footer">
          {task.assigneeImg
            ? <img src={task.assigneeImg} alt={task.assigneeName || ''} className="avatar backlog-avatar" title={task.assigneeName} />
            : <span className="workspace-avatar-empty backlog-avatar" title="Unassigned" />
          }
          {canEdit && (
            <button
              type="button"
              className={`btn btn-outline btn-sm backlog-plan-btn ${inSprint ? 'planned' : ''}`}
              onClick={toggleSprint}
              disabled={!ready && !inSprint}
              title={!ready && !inSprint ? 'Resolve grooming issues first' : undefined}
              aria-label={inSprint ? `Remove ${task.code} from sprint draft` : `Add ${task.code} to sprint draft`}
            >
              {inSprint ? <><X size={12} /> Remove</> : <><Plus size={12} /> Plan</>}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
