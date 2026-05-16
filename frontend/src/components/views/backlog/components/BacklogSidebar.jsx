import { Activity, CalendarClock, CheckCircle2, ListTodo, Trash2, TriangleAlert, UsersRound } from 'lucide-react';

function percent(part, whole) {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

function formatDueDate(date) {
  if (!date) return 'No date';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function BacklogSidebar({
  planned, ready, grooming, unscheduled, overdue, highUrgency, sprintDraft,
  columns, columnOrder, visibleTasks, activeBucket,
  onSelectTask, onUpdateTask, onBucketClick,
}) {
  const scheduledPercent = percent(planned.length - unscheduled.length, planned.length);
  const readyPercent = percent(ready.length, planned.length);
  const assignedPercent = percent(planned.filter(t => t.assigneeImg).length, planned.length);

  // Workflow mix: count of visibleTasks per column (reflects active bucket)
  const workflowCounts = columnOrder.reduce((acc, colId) => {
    acc[colId] = visibleTasks.filter(t => t.columnId === colId).length;
    return acc;
  }, {});

  return (
    <aside className="backlog-sidebar">

      {/* Planning health */}
      <section className="workspace-panel">
        <div className="workspace-panel-header compact">
          <h2>Planning health</h2>
          <Activity size={15} />
        </div>
        <div className="backlog-health">
          {[
            { label: 'Scheduled', value: scheduledPercent },
            { label: 'Ready', value: readyPercent },
            { label: 'Assigned', value: assignedPercent },
          ].map(({ label, value }) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}%</strong>
              <div className="workspace-load">
                <span style={{ width: `${value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Sprint draft */}
      <section className="workspace-panel">
        <div className="workspace-panel-header compact">
          <h2>Next sprint draft</h2>
          <CheckCircle2 size={15} />
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
                title="Remove from sprint"
              >
                <Trash2 size={13} />
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

      {/* Workflow mix — reflects active bucket */}
      <section className="workspace-panel">
        <div className="workspace-panel-header compact">
          <h2>Workflow mix</h2>
          <ListTodo size={15} />
        </div>
        <div className="backlog-workflow">
          {columnOrder.map(colId => {
            const col = columns[colId];
            if (!col) return null;
            const count = workflowCounts[colId] ?? 0;
            return (
              <div key={colId} className={count === 0 ? 'muted' : ''}>
                <span>{col.title}</span>
                <strong>{count}</strong>
              </div>
            );
          })}
        </div>
      </section>

      {/* Attention */}
      <section className="workspace-panel">
        <div className="workspace-panel-header compact">
          <h2>Attention</h2>
          <CalendarClock size={15} />
        </div>
        <div className="backlog-attention">
          <button
            type="button"
            className={`backlog-attention-row ${activeBucket === 'overdue' ? 'is-active' : ''}`}
            onClick={() => onBucketClick('overdue')}
          >
            <TriangleAlert size={14} className="accent-red" />
            <span>Overdue</span>
            <strong className={overdue.length > 0 ? 'accent-red' : ''}>{overdue.length}</strong>
          </button>
          <button
            type="button"
            className={`backlog-attention-row ${activeBucket === 'unscheduled' ? 'is-active' : ''}`}
            onClick={() => onBucketClick('unscheduled')}
          >
            <CalendarClock size={14} />
            <span>Unscheduled</span>
            <strong>{unscheduled.length}</strong>
          </button>
          <button
            type="button"
            className={`backlog-attention-row ${activeBucket === 'grooming' ? 'is-active' : ''}`}
            onClick={() => onBucketClick('grooming')}
          >
            <UsersRound size={14} />
            <span>Needs grooming</span>
            <strong>{grooming.length}</strong>
          </button>
          <button
            type="button"
            className={`backlog-attention-row ${activeBucket === 'urgent' ? 'is-active' : ''}`}
            onClick={() => onBucketClick('urgent')}
          >
            <Activity size={14} />
            <span>High urgency</span>
            <strong>{highUrgency.length}</strong>
          </button>
        </div>
      </section>

    </aside>
  );
}
