import { useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Flame, ListFilter } from 'lucide-react';
import { MyTaskRow, MyTasksFocus, MyTasksSidebar, MyTasksStats } from './components/index.js';
import { isOverdue } from '../../../utils/helpers.js';
import './css/mytasks.css';

const priorityRank = { Critical: 0, High: 1, Medium: 2, Low: 3 };

function sortPersonalQueue(a, b) {
  const priorityDiff = (priorityRank[a.priority] ?? 4) - (priorityRank[b.priority] ?? 4);
  if (priorityDiff !== 0) return priorityDiff;
  if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
  if (a.dueDate) return -1;
  if (b.dueDate) return 1;
  return a.code.localeCompare(b.code);
}

export default function MyTasksView({ tasks, columns, columnOrder, onSelectTask, onMoveTask, onUpdateTask, user, canEdit = true }) {
  const [queue, setQueue] = useState('open');

  // Tasks assigned to the current user (by id if available, fallback to any assigned)
  const assigned = useMemo(() => {
    const open = tasks.filter(t => t.columnTitle !== 'Done');
    if (user?.id) {
      const mine = open.filter(t => t.assigneeId === user.id);
      // Fallback: if nothing matches by id, show all assigned (demo mode)
      return (mine.length > 0 ? mine : open.filter(t => t.assigneeImg)).sort(sortPersonalQueue);
    }
    return open.filter(t => t.assigneeImg).sort(sortPersonalQueue);
  }, [tasks, user]);

  const urgent = useMemo(
    () => assigned.filter(t => t.priority === 'Critical' || t.priority === 'High'),
    [assigned]
  );
  const overdueList = useMemo(
    () => assigned.filter(t => isOverdue(t.dueDate)),
    [assigned]
  );
  const done = useMemo(
    () => tasks.filter(t => t.columnTitle === 'Done').sort(sortPersonalQueue),
    [tasks]
  );

  const doneColumnId = columnOrder.find(id => columns[id]?.title.toLowerCase() === 'done');

  const stats = [
    { key: 'open',    label: 'Assigned',  value: assigned.length,    icon: ListFilter,   accent: null },
    { key: 'urgent',  label: 'Urgent',    value: urgent.length,      icon: Flame,        accent: 'orange' },
    { key: 'overdue', label: 'Overdue',   value: overdueList.length, icon: Clock3,       accent: 'red' },
    { key: 'done',    label: 'Done',      value: done.length,        icon: CheckCircle2, accent: 'blue' },
  ];

  const queueLabels = {
    open: 'Open',
    urgent: 'Urgent',
    overdue: 'Overdue',
    done: 'Done',
  };

  const visibleTasks = {
    open: assigned,
    urgent,
    overdue: overdueList,
    done,
  }[queue] ?? assigned;

  return (
    <section className="workspace-view my-tasks-view">
      <div className="workspace-page mywork-inner-page">

        <MyTasksStats
          items={stats}
          activeQueue={queue}
          onQueueClick={setQueue}
        />

        <div className="mytasks-layout">
          <div className="workspace-panel primary mytasks-main-panel">
            <div className="workspace-panel-header">
              <div>
                <h2>{queueLabels[queue]} work</h2>
                <span>
                  {queue === 'done'
                    ? 'Completed cards from this workspace'
                    : queue === 'overdue'
                      ? 'Past due date — needs attention'
                      : 'Sorted by urgency, date, and board state'}
                </span>
              </div>
              <span className="mytasks-count">{visibleTasks.length} shown</span>
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
                  canEdit={canEdit}
                />
              ))}
              {visibleTasks.length === 0 && (
                <div className="workspace-empty-state">
                  <strong>No tasks here</strong>
                  <span>
                    {queue === 'done'
                      ? 'Completed cards will appear once work moves to Done.'
                      : queue === 'overdue'
                        ? 'Nothing overdue — great work.'
                        : 'This queue is clear for now.'}
                  </span>
                </div>
              )}
            </div>
          </div>

          <MyTasksSidebar
            assigned={assigned}
            urgent={urgent}
            overdue={overdueList}
            done={done}
            onSelectTask={onSelectTask}
          />
        </div>

        <MyTasksFocus assigned={assigned} onSelectTask={onSelectTask} />
      </div>
    </section>
  );
}
