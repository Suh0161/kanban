import { CheckCheck, Inbox, ShieldAlert, UserRound } from 'lucide-react';

export default function InboxSidebar({
  inboxTasks,
  visibleTasks,
  criticalCount,
  unassignedCount,
  triageColumnId,
  onMoveTask,
  onSelectTask
}) {
  const urgentReports = inboxTasks.filter(task => task.priority === 'Critical' || task.priority === 'High').slice(0, 3);

  return (
    <aside className="inbox-sidebar">
      <section className="workspace-panel">
        <div className="workspace-panel-header compact">
          <h2>Intake health</h2>
          <span>Live</span>
        </div>
        <div className="inbox-health">
          <div>
            <Inbox size={15} />
            <span>Visible reports</span>
            <strong>{visibleTasks.length}</strong>
          </div>
          <div>
            <ShieldAlert size={15} />
            <span>Urgent</span>
            <strong>{criticalCount}</strong>
          </div>
          <div>
            <UserRound size={15} />
            <span>Unassigned</span>
            <strong>{unassignedCount}</strong>
          </div>
        </div>
      </section>

      <section className="workspace-panel">
        <div className="workspace-panel-header">
          <div>
            <h2>Quick triage</h2>
            <span>Highest urgency first</span>
          </div>
          <span>{urgentReports.length}</span>
        </div>
        <div className="inbox-quick-list">
          {urgentReports.map(task => (
            <div key={task.id}>
              <button type="button" onClick={() => onSelectTask(task)}>
                <span>{task.code}</span>
                <strong>{task.title}</strong>
              </button>
              <button className="btn btn-outline btn-sm" type="button" onClick={() => onMoveTask(task.id, triageColumnId)}>
                <CheckCheck size={13} /> Send
              </button>
            </div>
          ))}
          {urgentReports.length === 0 && (
            <div className="workspace-empty-state">
              <strong>No urgent reports</strong>
              <span>Incoming reports are calm right now.</span>
            </div>
          )}
        </div>
      </section>
    </aside>
  );
}
