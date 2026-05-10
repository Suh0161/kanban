import { useMemo, useState } from 'react';
import { Archive, CheckCheck, Inbox, ShieldAlert } from 'lucide-react';
import { InboxReportRow, InboxSidebar, InboxStats } from './components/index.js';
import './css/inbox.css';

const filters = {
  all: 'All',
  urgent: 'Urgent',
  exploit: 'Exploit',
  harassment: 'Harassment',
  unassigned: 'Unassigned'
};

function matchesFilter(task, filter) {
  if (filter === 'urgent') return task.priority === 'Critical' || task.priority === 'High';
  if (filter === 'exploit') return task.tags.some(tag => tag.toLowerCase() === 'exploit');
  if (filter === 'harassment') return task.tags.some(tag => tag.toLowerCase() === 'harassment');
  if (filter === 'unassigned') return !task.assigneeImg;
  return true;
}

export default function InboxView({ tasks, columns, columnOrder, onSelectTask, onMoveTask, onUpdateTask }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const inboxTasks = useMemo(
    () => tasks.filter(task => task.columnTitle === 'Inbox'),
    [tasks]
  );
  const visibleTasks = inboxTasks.filter(task => matchesFilter(task, activeFilter));
  const criticalCount = inboxTasks.filter(task => task.priority === 'Critical' || task.priority === 'High').length;
  const unassignedCount = inboxTasks.filter(task => !task.assigneeImg).length;
  const triageColumnId = columnOrder.find(columnId => columns[columnId]?.title.toLowerCase() === 'triage') || columnOrder[0];
  const doneColumnId = columnOrder.find(columnId => columns[columnId]?.title.toLowerCase() === 'done');

  const toggleSelected = (taskId) => {
    setSelectedIds(prev => prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]);
  };

  const moveSelected = (targetColumnId) => {
    if (!targetColumnId) return;
    selectedIds.forEach(taskId => onMoveTask(taskId, targetColumnId));
    setSelectedIds([]);
  };

  return (
    <section className="workspace-view inbox-view">
      <div className="workspace-page">
        <div className="workspace-page-header">
          <div>
            <span className="workspace-kicker">Intake</span>
            <h1>Inbox</h1>
          </div>
          <div className="workspace-actions">
            <button className="btn btn-outline btn-sm" type="button" onClick={() => moveSelected(doneColumnId)} disabled={!selectedIds.length || !doneColumnId}>
              <Archive size={14} /> Archive
            </button>
            <button className="btn btn-primary btn-sm" type="button" onClick={() => moveSelected(triageColumnId)} disabled={!selectedIds.length}>
              <CheckCheck size={14} /> Triage selected
            </button>
          </div>
        </div>

        <InboxStats
          items={[
            { label: 'New reports', value: inboxTasks.length, icon: Inbox },
            { label: 'Urgent', value: criticalCount, icon: ShieldAlert },
            { label: 'Unassigned', value: unassignedCount, icon: Inbox }
          ]}
        />

        <div className="inbox-layout">
          <div className="workspace-panel primary">
            <div className="workspace-panel-header">
              <div>
                <h2>Incoming reports</h2>
                <span>{inboxTasks.length} issues waiting for triage</span>
              </div>
              <span>{selectedIds.length} selected</span>
            </div>
            <div className="workspace-queue-toolbar inbox-filterbar">
              {Object.entries(filters).map(([key, label]) => (
                <button key={key} type="button" className={activeFilter === key ? 'active' : ''} onClick={() => setActiveFilter(key)}>
                  {label}
                </button>
              ))}
            </div>
            <div className="inbox-report-list">
              {visibleTasks.map(task => (
                <InboxReportRow
                  key={task.id}
                  task={task}
                  selected={selectedIds.includes(task.id)}
                  columns={columns}
                  columnOrder={columnOrder}
                  triageColumnId={triageColumnId}
                  onToggleSelected={toggleSelected}
                  onSelectTask={onSelectTask}
                  onMoveTask={onMoveTask}
                  onUpdateTask={onUpdateTask}
                />
              ))}
              {visibleTasks.length === 0 && (
                <div className="workspace-empty-state">
                  <strong>No reports match this filter</strong>
                  <span>Switch filters or create a new issue from the top bar.</span>
                </div>
              )}
            </div>
          </div>

          <InboxSidebar
            inboxTasks={inboxTasks}
            visibleTasks={visibleTasks}
            criticalCount={criticalCount}
            unassignedCount={unassignedCount}
            triageColumnId={triageColumnId}
            onMoveTask={onMoveTask}
            onSelectTask={onSelectTask}
          />
        </div>
      </div>
    </section>
  );
}
