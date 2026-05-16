import { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { MessageSquare, Paperclip, Calendar, Pencil, CheckSquare } from 'lucide-react';
import { formatDate, isOverdue, isDueToday } from '../../utils/helpers.js';
import TaskCardContextMenu from './TaskCardContextMenu';

const PRIORITY_DOT = {
  Critical: 'var(--color-red)',
  High:     'var(--color-orange)',
  Medium:   'var(--color-yellow)',
  Low:      'var(--color-blue)',
};

const MAX_VISIBLE_TAGS = 3;

export default function TaskCard({
  task, index, isFiltered,
  onSelect, onQuickEdit, onChangePriority, onMoveTask, onDeleteTask,
  onOpenModal = onSelect, columns, columnOrder, labels = [],
}) {
  const [hovered, setHovered] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);

  const dueDateClass = isOverdue(task.dueDate) ? 'overdue' : isDueToday(task.dueDate) ? 'due-today' : '';
  const totalChecks = task.checklists?.reduce((acc, cl) => acc + cl.items.length, 0) || 0;
  const doneChecks = task.checklists?.reduce((acc, cl) => acc + cl.items.filter(i => i.done).length, 0) || 0;
  const hasChecklists = totalChecks > 0;
  const taskLabels = (task.labelIds || []).map(id => labels.find(l => l.id === id)).filter(Boolean);
  const visibleTags = (task.tags || []).slice(0, MAX_VISIBLE_TAGS);
  const hiddenTagCount = Math.max(0, (task.tags?.length || 0) - MAX_VISIBLE_TAGS);
  const commentCount = task.metrics?.comments || 0;
  const attachmentCount = task.metrics?.attachments || 0;

  return (
    <>
      <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={isFiltered}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`card ${snapshot.isDragging ? 'is-dragging' : ''}`}
            onClick={() => onSelect(task)}
            onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, task }); }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={provided.draggableProps.style}
          >
            {task.attachments?.length > 0 && (
              <div className="card-cover">
                <img src={task.attachments[0].url} alt="" />
              </div>
            )}

            {taskLabels.length > 0 && (
              <div className="card-label-strips">
                {taskLabels.map(label => (
                  <span key={label.id} className="card-label-strip" style={{ background: label.color }} title={label.name} />
                ))}
              </div>
            )}

            <div className="card-header">
              <span className="card-id" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {task.priority && (
                  <span
                    style={{ width: 7, height: 7, borderRadius: '50%', background: PRIORITY_DOT[task.priority] || 'var(--text-tertiary)', flexShrink: 0 }}
                    title={`${task.priority} priority`}
                  />
                )}
                {task.code}
              </span>
              {task.dueDate && (
                <span className={`card-due ${dueDateClass}`}>
                  <Calendar size={10} /> {formatDate(task.dueDate)}
                </span>
              )}
            </div>

            <div className="card-title-row">
              <h4 className="card-title">{task.title}</h4>
              <button
                className={`card-quick-edit ${hovered ? 'visible' : ''}`}
                title="Quick edit"
                onClick={e => { e.stopPropagation(); onQuickEdit(task); }}
              >
                <Pencil size={13} />
              </button>
            </div>

            {visibleTags.length > 0 && (
              <div className="tags">
                {visibleTags.map(tag => <span key={tag} className="tag type-label">{tag}</span>)}
                {hiddenTagCount > 0 && (
                  <span className="tag type-label" title={(task.tags || []).slice(MAX_VISIBLE_TAGS).join(', ')}>+{hiddenTagCount}</span>
                )}
              </div>
            )}

            {(commentCount > 0 || attachmentCount > 0 || hasChecklists || task.assigneeImg) && (
              <div className="card-footer">
                <div className="card-metrics">
                  {commentCount > 0 && <span className="metric active" title={`${commentCount} comments`}><MessageSquare size={12} /> {commentCount}</span>}
                  {attachmentCount > 0 && <span className="metric active" title={`${attachmentCount} attachments`}><Paperclip size={12} /> {attachmentCount}</span>}
                  {hasChecklists && (
                    <span className={`metric active ${doneChecks === totalChecks ? 'done' : ''}`} title={`${doneChecks}/${totalChecks} done`}>
                      <CheckSquare size={12} /> {doneChecks}/{totalChecks}
                    </span>
                  )}
                </div>
                <div className="card-assignees">
                  {task.assigneeImg && <img src={task.assigneeImg} alt="" className="avatar tiny" title={task.assigneeName || 'Assignee'} />}
                </div>
              </div>
            )}
          </div>
        )}
      </Draggable>
      {contextMenu && (
        <TaskCardContextMenu
          task={contextMenu.task}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          columns={columns}
          columnOrder={columnOrder}
          onClose={() => setContextMenu(null)}
          onChangePriority={onChangePriority}
          onMoveTask={onMoveTask}
          onDeleteTask={onDeleteTask}
          onOpenModal={onOpenModal}
        />
      )}
    </>
  );
}
