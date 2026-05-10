import { useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, Flame, ListFilter, MessageSquare } from 'lucide-react';
import { MyTaskRow, MyTasksFocus, MyTasksSidebar, MyTasksStats } from './components/index.js';
import { isOverdue } from '../../../utils/helpers.js';
import './css/mytasks.css';

const queueLabels = {
  open: 'Open',
  urgent: 'Urgent',
  watching: 'Watching',
  done: 'Done'
};

const priorityRank = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3
};

function sortPersonalQueue(a, b) {
  const priorityDiff = (priorityRank[a.priority] ?? 4) - (priorityRank[b.priority] ?? 4);
  if (priorityDiff !== 0) return priorityDiff;
  if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
  if (a.dueDate) return -1;
  if (b.dueDate) return 1;
  return a.code.localeCompare(b.code);
}

export default function MyTasksView({ tasks, columns, columnOrder, onSelectTask, onMoveTask, onUpdateTask }) {
  const [queue, setQueue] = useState('open');
  const assigned = useMemo(
    () => tasks.filter(task => task.assigneeImg && task.columnTitle !== 'Done').sort(sortPersonalQueue),
    [tasks]
  );
  const watching = useMemo(
    () => tasks.filter(task => task.metrics.comments >= 4 && task.columnTitle !== 'Done').sort(sortPersonalQueue),
    [tasks]
  );
  const done = tasks.filter(task => task.columnTitle === 'Done').sort(sortPersonalQueue);
  const urgent = assigned.filter(task => task.priority === 'Critical' || task.priority === 'High');
  const overdue = assigned.filter(task => isOverdue(task.dueDate));
  const discussionVolume = assigned.reduce((sum, task) => sum + task.metrics.comments, 0);
  const doneColumnId = columnOrder.find(columnId => columns[columnId]?.title.toLowerCase() === 'done');

  const visibleTasks = {
    open: assigned,
    urgent,
    watching,
    done
  }[queue];

  return (
    <section className="workspace-view my-tasks-view">
      <div className="workspace-page">
        <div className="workspace-page-header">
          <div>
            <span className="workspace-kicker">Personal queue</span>
            <h1>My Tasks</h1>
          </div>
          <div className="workspace-segmented mytasks-tabs" aria-label="Task view">
            {Object.entries(queueLabels).map(([key, label]) => (
              <button key={key} type="button" className={queue === key ? 'active' : ''} onClick={() => setQueue(key)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <MyTasksStats
          items={[
            { label: 'Assigned', value: assigned.length, icon: ListFilter },
            { label: 'Urgent', value: urgent.length, icon: Flame },
            { label: 'Overdue', value: overdue.length, icon: Clock3 },
            { label: 'Discussions', value: discussionVolume, icon: MessageSquare }
          ]}
        />

        <div className="mytasks-layout">
          <div className="workspace-panel primary mytasks-main-panel">
            <div className="workspace-panel-header">
              <div>
                <h2>{queueLabels[queue]} work</h2>
                <span>{queue === 'done' ? 'Completed cards from this workspace' : 'Sorted by urgency, date, and board state'}</span>
              </div>
              <span>{visibleTasks.length} shown</span>
            </div>
            <div className="mytasks-list">
              {visibleTasks.map(task => (
                <MyTaskRow
                  key={task.id}
                  task={task}
                  columns={columns}
                  columnOrder={columnOrder}
                  doneColumnId={doneColumnId}
                  onSelectTask={onSelectTask}
                  onMoveTask={onMoveTask}
                  onUpdateTask={onUpdateTask}
                />
              ))}
              {visibleTasks.length === 0 && (
                <div className="workspace-empty-state">
                  <strong>No tasks here</strong>
                  <span>{queue === 'done' ? 'Completed cards will show once work moves to Done.' : 'This queue is clear for now.'}</span>
                </div>
              )}
            </div>
          </div>

          <MyTasksSidebar
            assigned={assigned}
            urgent={urgent}
            overdue={overdue}
            watching={watching}
            onSelectTask={onSelectTask}
          />
        </div>

        <MyTasksFocus
          items={[
            { time: '09:30', title: 'Review intake and exploit reports', meta: 'Inbox and Triage', icon: CalendarDays },
            { time: '12:00', title: 'Patch decision window', meta: 'Critical incidents', icon: Flame },
            { time: '16:15', title: 'Community follow-up', meta: 'Player safety response', icon: CheckCircle2 }
          ]}
        />
      </div>
    </section>
  );
}
