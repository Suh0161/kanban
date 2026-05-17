import { CheckCheck, ShieldAlert } from 'lucide-react';

export default function InboxSidebar({
  inboxTasks,
  triageColumnId,
  onMoveTask,
  onSelectTask,
  canEdit = true,
}) {
  const urgentReports = inboxTasks.filter(task => task.priority === 'Critical' || task.priority === 'High').slice(0, 3);

  return (
    <aside className="inbox-sidebar">
      <section className="workspace-panel">
        <div className="workspace-panel-header">
          <div>
            <h2>Quick triage</h2>
            <span>Highest urgency first</span>
          </div>
          <ShieldAlert size={15} />
        </div>
        <div className="inbox-quick-list">
          {urgentReports.map(task => (
            <div key={task.id}>
              <button type="button" onClick={() => onSelectTask(task)}>
                <span>{task.code}</span>
                <strong>{task.title}</strong>
              </button>
              {canEdit && (
                <button className="btn btn-outline btn-sm" type="button" onClick={() => onMoveTask(task.id, triageColumnId)}>
                  <CheckCheck size={13} /> Send
                </button>
              )}
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
