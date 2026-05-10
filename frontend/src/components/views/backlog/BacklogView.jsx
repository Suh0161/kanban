import { useMemo, useState } from 'react';
import { BacklogIssueRow, BacklogLane, BacklogSidebar, BacklogStats } from './components/index.js';
import './css/backlog.css';

const bucketLabels = {
  all: 'All open',
  grooming: 'Needs grooming',
  ready: 'Ready',
  sprint: 'Sprint draft',
  unscheduled: 'Unscheduled'
};

const priorityRank = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3
};

function sortForPlanning(a, b) {
  const priorityDiff = (priorityRank[a.priority] ?? 4) - (priorityRank[b.priority] ?? 4);
  if (priorityDiff !== 0) return priorityDiff;
  if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
  if (a.dueDate) return -1;
  if (b.dueDate) return 1;
  return a.code.localeCompare(b.code);
}

function isReady(task) {
  return Boolean(task.dueDate && task.assigneeImg && task.columnTitle !== 'Inbox');
}

function needsGrooming(task) {
  return task.columnTitle === 'Inbox' || !task.dueDate || !task.assigneeImg;
}

export default function BacklogView({ tasks, columns, columnOrder, onSelectTask, onMoveTask, onUpdateTask }) {
  const [activeBucket, setActiveBucket] = useState('all');
  const planned = useMemo(
    () => tasks.filter(task => task.columnTitle !== 'Done').sort(sortForPlanning),
    [tasks]
  );

  const ready = planned.filter(isReady);
  const grooming = planned.filter(needsGrooming);
  const unscheduled = planned.filter(task => !task.dueDate);
  const highUrgency = planned.filter(task => task.priority === 'Critical' || task.priority === 'High');
  const sprintDraft = planned.filter(task => task.sprintId === 'next-sprint');

  const visibleTasks = {
    all: planned,
    grooming,
    ready,
    sprint: sprintDraft,
    unscheduled
  }[activeBucket];

  const lanes = columnOrder
    .map(columnId => {
      const column = columns[columnId];
      if (!column) return null;
      return {
        id: columnId,
        title: column.title,
        tasks: visibleTasks.filter(task => task.columnId === columnId)
      };
    })
    .filter(Boolean);

  return (
    <section className="workspace-view backlog-view">
      <div className="workspace-page">
        <div className="workspace-page-header">
          <div>
            <span className="workspace-kicker">Planning</span>
            <h1>Backlog</h1>
          </div>
          <div className="workspace-segmented backlog-bucket-tabs">
            {Object.entries(bucketLabels).map(([bucket, label]) => (
              <button
                key={bucket}
                type="button"
                className={activeBucket === bucket ? 'active' : ''}
                onClick={() => setActiveBucket(bucket)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <BacklogStats
          total={planned.length}
          ready={ready.length}
          grooming={grooming.length}
          unscheduled={unscheduled.length}
          highUrgency={highUrgency.length}
          sprintDraft={sprintDraft.length}
        />

        <div className="backlog-layout">
          <div className="backlog-board">
            {lanes.map(lane => (
              <BacklogLane
                key={lane.id}
                title={lane.title}
                count={lane.tasks.length}
                description={activeBucket === 'all' ? 'Current work in this board list' : bucketLabels[activeBucket]}
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
                    />
                  ))
                ) : (
                  <div className="backlog-empty-lane">
                    <strong>No issues here</strong>
                    <span>This lane has no items for the current planning filter.</span>
                  </div>
                )}
              </BacklogLane>
            ))}
          </div>

          <BacklogSidebar
            planned={planned}
            ready={ready}
            grooming={grooming}
            unscheduled={unscheduled}
            highUrgency={highUrgency}
            sprintDraft={sprintDraft}
            columns={columns}
            columnOrder={columnOrder}
            onSelectTask={onSelectTask}
            onUpdateTask={onUpdateTask}
          />
        </div>
      </div>
    </section>
  );
}
