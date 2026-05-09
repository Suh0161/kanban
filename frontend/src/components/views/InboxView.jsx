import { Archive, CheckCheck, Inbox, ShieldAlert } from 'lucide-react';
import ViewTaskRow from './ViewTaskRow.jsx';

export default function InboxView({ tasks, onSelectTask }) {
  const inboxTasks = tasks.filter(task => task.columnTitle === 'Inbox');
  const criticalCount = inboxTasks.filter(task => task.priority === 'Critical' || task.priority === 'High').length;

  return (
    <section className="workspace-view inbox-view">
      <div className="workspace-page">
        <div className="workspace-page-header">
          <div>
            <span className="workspace-kicker">Intake</span>
            <h1>Inbox</h1>
          </div>
          <div className="workspace-actions">
            <button className="btn btn-outline btn-sm" type="button"><Archive size={14} /> Archive</button>
            <button className="btn btn-outline btn-sm" type="button"><CheckCheck size={14} /> Triage selected</button>
          </div>
        </div>

        <div className="workspace-inbox-layout">
          <div className="workspace-panel primary">
            <div className="workspace-panel-header">
              <div>
                <h2>Incoming reports</h2>
                <span>{inboxTasks.length} issues waiting for triage</span>
              </div>
              <span>{criticalCount} urgent</span>
            </div>
            <div className="workspace-queue-toolbar">
              <button type="button" className="active">All</button>
              <button type="button">Exploit</button>
              <button type="button">Harassment</button>
              <button type="button">Unassigned</button>
            </div>
            <div className="workspace-list dense">
              {inboxTasks.map(task => (
                <ViewTaskRow key={task.id} task={task} columnTitle={task.columnTitle} onSelectTask={onSelectTask} />
              ))}
            </div>
          </div>

          <aside className="workspace-panel side">
            <div className="workspace-panel-header compact">
              <h2>Intake health</h2>
              <span>Live</span>
            </div>
            <div className="workspace-health-list">
              <div>
                <Inbox size={16} />
                <span>New reports</span>
                <strong>{inboxTasks.length}</strong>
              </div>
              <div>
                <ShieldAlert size={16} />
                <span>Urgent</span>
                <strong>{criticalCount}</strong>
              </div>
              <div>
                <CheckCheck size={16} />
                <span>Ready for triage</span>
                <strong>{Math.max(inboxTasks.length - criticalCount, 0)}</strong>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
