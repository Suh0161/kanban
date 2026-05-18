import Select from '../../../ui/Select.jsx';
import { PRIORITIES } from '../../../../constants.js';
import WatcherControl from './WatcherControl.jsx';
import useDebouncedCommit from '../../../../hooks/useDebouncedCommit.js';

export default function TaskDetailSidebar({
  task,
  columns,
  columnOrder,
  currentColumnId,
  labels = [],
  members = [],
  onMoveTask,
  onUpdateTask,
  onUpdateDueDate,
  canEdit = true,
}) {
  const statusOptions = columnOrder.map(columnId => ({
    value: columnId,
    label: columns[columnId].title,
  }));

  const tags = task.tags || [];
  const tagValue = tags.join(', ');

  // Debounced tag input — tags are comma-separated free text. Committing
  // on every keystroke fired a PATCH per character.
  const { localValue: localTagValue, onChange: onTagChange, onBlur: onTagBlur } = useDebouncedCommit({
    value: tagValue,
    onCommit: next => onUpdateTask(task.id, {
      tags: next.split(',').map(t => t.trim()).filter(Boolean),
    }),
    delay: 400,
  });

  // Look up the human-readable values used for read-only viewers below.
  const statusLabel = currentColumnId ? columns[currentColumnId]?.title : '\u2014';
  const priorityLabel = task.priority || '\u2014';
  const assigneeLabel = task.assigneeId
    ? (members.find(m => m.id === task.assigneeId)?.name || task.assigneeName || 'Assigned')
    : 'Unassigned';

  return (
    <aside className="task-detail-sidebar">
      <div className="property">
        <span className="property-label">Status</span>
        {canEdit ? (
          <Select
            value={currentColumnId || ''}
            onChange={val => onMoveTask(task.id, val)}
            options={statusOptions}
          />
        ) : (
          <span className="property-readonly">{statusLabel}</span>
        )}
      </div>

      <div className="property">
        <span className="property-label">Priority</span>
        {canEdit ? (
          <Select
            value={task.priority}
            onChange={val => onUpdateTask(task.id, { priority: val })}
            options={PRIORITIES.map(p => ({ value: p, label: p }))}
          />
        ) : (
          <span className="property-readonly">{priorityLabel}</span>
        )}
      </div>

      <div className="property">
        <span className="property-label">Assignee</span>
        {canEdit ? (
          <Select
            value={task.assigneeId || ''}
            onChange={val => {
              const member = members.find(m => m.id === val);
              onUpdateTask(task.id, {
                assigneeId: val || null,
                assigneeName: member?.name || null,
                assigneeImg: member?.avatar || null,
              });
            }}
            options={[
              { value: '', label: 'Unassigned' },
              ...members.map(m => ({ value: m.id, label: m.name })),
            ]}
          />
        ) : (
          <span className="property-readonly">{assigneeLabel}</span>
        )}
      </div>

      <div className="property">
        <span className="property-label">Due date</span>
        <input
          type="date"
          className="date-input"
          value={task.dueDate || ''}
          onChange={(e) => onUpdateDueDate(task.id, e.target.value)}
          disabled={!canEdit}
          readOnly={!canEdit}
        />
      </div>

      <div className="property">
        <span className="property-label">Tags</span>
        <input
          className="form-input"
          value={localTagValue}
          onChange={onTagChange}
          onBlur={onTagBlur}
          placeholder="Bug, Exploit"
          disabled={!canEdit}
          readOnly={!canEdit}
        />
      </div>

      {labels.length > 0 && (
        <div className="property property-stack">
          <span className="property-label">Labels</span>
          <div className="task-detail-label-picker">
            {labels.map(label => {
              const isSelected = (task.labelIds || []).includes(label.id);
              return (
                <button
                  key={label.id}
                  type="button"
                  className={`task-detail-label-chip ${isSelected ? 'selected' : ''}`}
                  style={{ background: label.color }}
                  onClick={() => {
                    if (!canEdit) return;
                    const current = task.labelIds || [];
                    const next = isSelected
                      ? current.filter(id => id !== label.id)
                      : [...current, label.id];
                    onUpdateTask(task.id, { labelIds: next });
                  }}
                  disabled={!canEdit}
                >
                  {label.name || 'Label'}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="property property-stack">
        <span className="property-label">Watchers</span>
        <WatcherControl taskId={task.id} />
      </div>
    </aside>
  );
}
