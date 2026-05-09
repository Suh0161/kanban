import { CheckCircle2, Clock3, Flame, ListFilter } from 'lucide-react';
import ViewTaskRow from './ViewTaskRow.jsx';

export default function MyTasksView({ tasks, onSelectTask }) {
  const assigned = tasks.filter(task => task.assigneeImg).slice(0, 4);
  const review = tasks.filter(task => task.priority === 'High' || task.priority === 'Critical');
  const highUrgency = assigned.filter(task => task.priority === 'Critical' || task.priority === 'High').length;
  const comments = assigned.reduce((sum, task) => sum + task.metrics.comments, 0);

  return (
    <section className="workspace-view my-tasks-view">
      <div className="workspace-page">
        <div className="workspace-page-header">
          <div>
            <span className="workspace-kicker">Personal queue</span>
            <h1>My Tasks</h1>
          </div>
          <div className="workspace-segmented" aria-label="Task view">
            <button type="button" className="active">Open</button>
            <button type="button">Watching</button>
            <button type="button">Done</button>
          </div>
        </div>

        <div className="workspace-summary-row">
          <div className="workspace-summary-item">
            <ListFilter size={16} />
            <span>Assigned</span>
            <strong>{assigned.length}</strong>
          </div>
          <div className="workspace-summary-item">
            <Flame size={16} />
            <span>High urgency</span>
            <strong>{highUrgency}</strong>
          </div>
          <div className="workspace-summary-item">
            <Clock3 size={16} />
            <span>Discussion</span>
            <strong>{comments}</strong>
          </div>
        </div>

        <div className="workspace-columns">
          <div className="workspace-panel primary">
            <div className="workspace-panel-header">
              <div>
                <h2>Assigned to me</h2>
                <span>Sorted by urgency and board status</span>
              </div>
              <span>{assigned.length} open</span>
            </div>
            <div className="workspace-list dense">
              {assigned.map(task => (
                <ViewTaskRow key={task.id} task={task} columnTitle={task.columnTitle} onSelectTask={onSelectTask} />
              ))}
            </div>
          </div>

          <aside className="workspace-panel side">
            <div className="workspace-panel-header">
              <div>
                <h2>Needs review</h2>
                <span>Hot items before release sync</span>
              </div>
              <span>{review.length}</span>
            </div>
            <div className="workspace-checklist">
              {review.map(task => (
                <button key={task.id} className="workspace-review-row" type="button" onClick={() => onSelectTask(task)}>
                  <CheckCircle2 size={16} />
                  <span>{task.title}</span>
                  <strong>{task.code}</strong>
                </button>
              ))}
            </div>
          </aside>
        </div>

        <div className="workspace-panel timeline">
          <div className="workspace-panel-header compact">
            <h2>Focus timeline</h2>
            <span>Today</span>
          </div>
          <div className="workspace-timeline">
            <div><span>09:30</span><strong>Review exploit reports</strong><em>Inbox and Triage</em></div>
            <div><span>12:00</span><strong>Patch decision window</strong><em>Critical incidents</em></div>
            <div><span>16:15</span><strong>Community follow-up</strong><em>Player safety response</em></div>
          </div>
        </div>
      </div>
    </section>
  );
}
