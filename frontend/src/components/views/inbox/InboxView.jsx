import { useMemo, useState } from 'react';
import { Archive, CheckCheck, ClipboardList, ShieldAlert, UserRound } from 'lucide-react';
import { InboxReportRow, InboxSidebar, InboxStats } from './components/index.js';
import './css/inbox.css';

export default function InboxView({ tasks, columns, columnOrder, onSelectTask, onMoveTask, onUpdateTask, canEdit = true }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const inboxTasks = useMemo(
    () => tasks.filter(task => task.columnTitle === 'Inbox'),
    [tasks]
  );

  // Build dynamic filters from actual tags in inbox tasks
  const dynamicFilters = useMemo(() => {
    const tagCounts = new Map();
    for (const task of inboxTasks) {
      for (const tag of task.tags || []) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }
    const tagFilters = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([tag]) => ({ key: tag.toLowerCase().replace(/\s+/g, '-'), label: tag }));
    return [
      { key: 'all', label: 'All' },
      { key: 'urgent', label: 'Urgent' },
      { key: 'unassigned', label: 'Unassigned' },
      ...tagFilters,
    ];
  }, [inboxTasks]);

  function matchesFilter(task, filter) {
    if (filter === 'urgent') return task.priority === 'Critical' || task.priority === 'High';
    if (filter === 'unassigned') return !task.assigneeImg;
    if (filter === 'all') return true;
    // Dynamic tag filter
    const filterLabel = dynamicFilters.find(f => f.key === filter)?.label;
    if (filterLabel) return task.tags?.some(tag => tag.toLowerCase() === filterLabel.toLowerCase());
    return true;
  }
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
      <div className="workspace-page mywork-inner-page">
        <div className="workspace-page-header">
          {canEdit && (
            <div className="inbox-actions">
              <button className="btn btn-outline btn-sm" type="button" onClick={() => moveSelected(doneColumnId)} disabled={!selectedIds.length || !doneColumnId}>
                <Archive size={14} /> Archive
              </button>
              <button className="btn btn-primary btn-sm" type="button" onClick={() => moveSelected(triageColumnId)} disabled={!selectedIds.length}>
                <CheckCheck size={14} /> Triage selected
              </button>
            </div>
          )}
        </div>

        <InboxStats
          items={[
            { label: 'New reports', value: inboxTasks.length, icon: ClipboardList },
            { label: 'Urgent', value: criticalCount, icon: ShieldAlert },
            { label: 'Unassigned', value: unassignedCount, icon: UserRound }
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
              {dynamicFilters.map(({ key, label }) => (
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
                  canEdit={canEdit}
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
            triageColumnId={triageColumnId}
            onMoveTask={onMoveTask}
            onSelectTask={onSelectTask}
            canEdit={canEdit}
          />
        </div>
      </div>
    </section>
  );
}
