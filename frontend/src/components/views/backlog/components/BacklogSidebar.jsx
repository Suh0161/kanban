import { Activity, CalendarClock, CheckCircle2, ListTodo, Trash2, UsersRound } from 'lucide-react';

function percent(part, whole) {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

function formatDueDate(date) {
  if (!date) return 'No date';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function BacklogSidebar({
  planned,
  ready,
  grooming,
  unscheduled,
  highUrgency,
  sprintDraft,
  columns,
  columnOrder,
  onSelectTask,
  onUpdateTask
}) {
  const scheduledPercent = percent(planned.length - unscheduled.length, planned.length);
  const readyPercent = percent(ready.length, planned.length);
  const assignedPercent = percent(planned.filter(task => task.assigneeImg).length, planned.length);

  return (
    <aside className="backlog-sidebar">
      <section className="workspace-panel">
        <div className="workspace-panel-header compact">
          <h2>Planning health</h2>
          <Activity size={16} />
        </div>
        <div className="backlog-health">
          <div>
            <span>Scheduled</span>
            <strong>{scheduledPercent}%</strong>
            <div className="workspace-load"><span style={{ width: `${scheduledPercent}%` }} /></div>
          </div>
          <div>
            <span>Ready</span>
            <strong>{readyPercent}%</strong>
            <div className="workspace-load"><span style={{ width: `${readyPercent}%` }} /></div>
          </div>
          <div>
            <span>Assigned</span>
            <strong>{assignedPercent}%</strong>
            <div className="workspace-load"><span style={{ width: `${assignedPercent}%` }} /></div>
          </div>
        </div>
      </section>

      <section className="workspace-panel">
        <div className="workspace-panel-header compact">
          <h2>Next sprint draft</h2>
          <CheckCircle2 size={16} />
        </div>
        <div className="backlog-sprint-draft">
          {sprintDraft.length > 0 ? sprintDraft.map(task => (
            <div className="backlog-sprint-item" key={task.id}>
              <button type="button" onClick={() => onSelectTask(task)}>
                <span>{task.code}</span>
                <strong>{task.title}</strong>
                <em>{formatDueDate(task.dueDate)}</em>
              </button>
              <button
                type="button"
                className="btn-icon-small"
                onClick={() => onUpdateTask(task.id, { sprintId: null })}
                aria-label={`Remove ${task.code} from sprint draft`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          )) : (
            <div className="workspace-empty-state">
              <strong>No sprint draft yet</strong>
              <span>Use Plan on ready issues to stage the next sprint.</span>
            </div>
          )}
        </div>
      </section>

      <section className="workspace-panel">
        <div className="workspace-panel-header compact">
          <h2>Workflow mix</h2>
          <ListTodo size={16} />
        </div>
        <div className="backlog-workflow">
          {columnOrder.map(columnId => {
            const column = columns[columnId];
            if (!column) return null;
            return (
              <div key={column.id}>
                <span>{column.title}</span>
                <strong>{column.taskIds.length}</strong>
              </div>
            );
          })}
        </div>
      </section>

      <section className="workspace-panel">
        <div className="workspace-panel-header compact">
          <h2>Attention</h2>
          <CalendarClock size={16} />
        </div>
        <div className="backlog-attention">
          <div>
            <CalendarClock size={15} />
            <span>Unscheduled</span>
            <strong>{unscheduled.length}</strong>
          </div>
          <div>
            <Activity size={15} />
            <span>High urgency</span>
            <strong>{highUrgency.length}</strong>
          </div>
          <div>
            <UsersRound size={15} />
            <span>Needs grooming</span>
            <strong>{grooming.length}</strong>
          </div>
        </div>
      </section>
    </aside>
  );
}
