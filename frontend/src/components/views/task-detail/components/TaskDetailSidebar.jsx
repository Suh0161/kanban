import { Eye } from 'lucide-react';
import Select from '../../../ui/Select.jsx';
import { PRIORITIES } from '../../../../constants.js';

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
}) {
  const statusOptions = columnOrder.map(columnId => ({
    value: columnId,
    label: columns[columnId].title,
  }));

  const tags = task.tags || [];
  const tagValue = tags.join(', ');

  return (
    <aside className="task-detail-sidebar">
      <div className="property">
        <span className="property-label">Status</span>
        <Select
          value={currentColumnId || ''}
          onChange={val => onMoveTask(task.id, val)}
          options={statusOptions}
        />
      </div>

      <div className="property">
        <span className="property-label">Priority</span>
        <Select
          value={task.priority}
          onChange={val => onUpdateTask(task.id, { priority: val })}
          options={PRIORITIES.map(p => ({ value: p, label: p }))}
        />
      </div>

      <div className="property">
        <span className="property-label">Assignee</span>
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
      </div>

      <div className="property">
        <span className="property-label">Due date</span>
        <input
          type="date"
          className="date-input"
          value={task.dueDate || ''}
          onChange={(e) => onUpdateDueDate(task.id, e.target.value)}
        />
      </div>

      <div className="property">
        <span className="property-label">Tags</span>
        <input
          className="form-input"
          value={tagValue}
          onChange={e => onUpdateTask(task.id, {
            tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
          })}
          placeholder="Bug, Exploit"
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
                    const current = task.labelIds || [];
                    const next = isSelected
                      ? current.filter(id => id !== label.id)
                      : [...current, label.id];
                    onUpdateTask(task.id, { labelIds: next });
                  }}
                >
                  {label.name || 'Label'}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="property">
        <span className="property-label">Watchers</span>
        <button type="button" className="task-detail-watch-btn">
          <Eye size={13} /> Watch
        </button>
      </div>
    </aside>
  );
}
