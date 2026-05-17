import { useMemo, useState } from 'react';
import { BacklogIssueRow, BacklogLane, BacklogSidebar, BacklogStats } from './components/index.js';
import { isReady, needsGrooming, isOverdue } from './backlogUtils.js';
import './css/backlog.css';

const priorityRank = { Critical: 0, High: 1, Medium: 2, Low: 3 };

function sortForPlanning(a, b) {
  const priorityDiff = (priorityRank[a.priority] ?? 4) - (priorityRank[b.priority] ?? 4);
  if (priorityDiff !== 0) return priorityDiff;
  if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
  if (a.dueDate) return -1;
  if (b.dueDate) return 1;
  return a.code.localeCompare(b.code);
}

export default function BacklogView({ tasks, columns, columnOrder, onSelectTask, onMoveTask, onUpdateTask, canEdit = true }) {
  const [activeBucket, setActiveBucket] = useState('all');

  const planned = useMemo(
    () => tasks.filter(task => task.columnTitle !== 'Done').sort(sortForPlanning),
    [tasks]
  );

  const ready = useMemo(() => planned.filter(isReady), [planned]);
  const grooming = useMemo(() => planned.filter(needsGrooming), [planned]);
  const unscheduled = useMemo(() => planned.filter(t => !t.dueDate), [planned]);
  const overdue = useMemo(() => planned.filter(isOverdue), [planned]);
  const highUrgency = useMemo(() => planned.filter(t => t.priority === 'Critical' || t.priority === 'High'), [planned]);
  const sprintDraft = useMemo(() => planned.filter(t => t.sprintId === 'next-sprint'), [planned]);

  const visibleTasks = {
    all: planned,
    grooming,
    ready,
    sprint: sprintDraft,
    overdue,
    unscheduled,
    urgent: highUrgency,
  }[activeBucket] ?? planned;

  const lanes = columnOrder
    .map(columnId => {
      const column = columns[columnId];
      if (!column) return null;
      const laneTasks = visibleTasks.filter(task => task.columnId === columnId);
      return { id: columnId, title: column.title, tasks: laneTasks };
    })
    .filter(Boolean)
    .filter(lane => activeBucket === 'all' || lane.tasks.length > 0);

  return (
    <section className="workspace-view backlog-view">
      <div className="workspace-page">
        <div className="workspace-page-header">
          <div>
            <span className="workspace-kicker">Planning</span>
            <h1>Backlog</h1>
          </div>
        </div>

        <BacklogStats
          total={planned.length}
          ready={ready.length}
          grooming={grooming.length}
          unscheduled={unscheduled.length}
          overdue={overdue.length}
          highUrgency={highUrgency.length}
          sprintDraft={sprintDraft.length}
          onBucketClick={setActiveBucket}
          activeBucket={activeBucket}
        />

        <div className="backlog-layout">
          <div className="backlog-board">
            {lanes.length === 0 ? (
              <div className="backlog-empty-board">
                <strong>No issues match this filter</strong>
                <span>Try switching to &quot;All open&quot; or a different bucket.</span>
              </div>
            ) : (
              lanes.map(lane => (
                <BacklogLane
                  key={lane.id}
                  title={lane.title}
                  count={lane.tasks.length}
                  bucket={activeBucket}
                >
                  {lane.tasks.length > 0 ? (
                    lane.tasks.map(task => (
                      <BacklogIssueRow
                        key={task.id}
                        task={task}
                        columns={columns}
                        columnOrder={columnOrder}
                        onSelectTask={onSelectTask}
                        onMoveTask={onMoveTask}
                        onUpdateTask={onUpdateTask}
                        canEdit={canEdit}
                      />
                    ))
                  ) : (
                    <div className="backlog-empty-lane">
                      <strong>No issues here</strong>
                      <span>This lane has no items for the current filter.</span>
                    </div>
                  )}
                </BacklogLane>
              ))
            )}
          </div>

          <BacklogSidebar
            planned={planned}
            ready={ready}
            unscheduled={unscheduled}
            sprintDraft={sprintDraft}
            columns={columns}
            columnOrder={columnOrder}
            visibleTasks={visibleTasks}
            onSelectTask={onSelectTask}
            onUpdateTask={onUpdateTask}
          />
        </div>
      </div>
    </section>
  );
}
