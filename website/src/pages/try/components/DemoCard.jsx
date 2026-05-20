import { useRef } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Calendar, CheckSquare, MessageSquare, Paperclip, Pencil } from 'lucide-react';
import { clampDragStyle, useTryDragBounds } from '../TryDragBoundsContext.jsx';

const PRIORITY_CLASS = {
  Critical: 'is-critical',
  High: 'is-high',
  Medium: 'is-medium',
  Low: 'is-low',
};

const MAX_VISIBLE_TAGS = 3;

function getDragStyle(style, snapshot, boundsEl, dragEl) {
  if (!snapshot.isDragging || !style) return style;
  return clampDragStyle(style, boundsEl, dragEl);
}

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export default function DemoCard({ task, index, isFiltered = false }) {
  const dragBoundsRef = useTryDragBounds();
  const cardRef = useRef(null);
  const priorityClass = task.priority ? PRIORITY_CLASS[task.priority] || '' : '';
  const showHeader = Boolean(task.priority || task.code);
  const visibleTags = (task.tags || []).slice(0, MAX_VISIBLE_TAGS);
  const hiddenTagCount = Math.max(0, (task.tags?.length || 0) - MAX_VISIBLE_TAGS);
  const totalChecks = task.checklists?.total || 0;
  const doneChecks = task.checklists?.done || 0;
  const hasFooter = Boolean(
    task.metrics?.comments ||
    task.metrics?.attachments ||
    totalChecks ||
    task.assigneeName
  );

  return (
    <Draggable draggableId={task.id} index={index} isDragDisabled={isFiltered}>
      {(provided, snapshot) => {
        const { style: draggableStyle, ...draggableProps } = provided.draggableProps;

        return (
        <div
          ref={(node) => {
            cardRef.current = node;
            provided.innerRef(node);
          }}
          {...draggableProps}
          {...provided.dragHandleProps}
          className={`demo-card card${snapshot.isDragging ? ' is-dragging' : ''}`}
          style={getDragStyle(
            draggableStyle,
            snapshot,
            dragBoundsRef?.current,
            cardRef.current,
          )}
        >
          {task.labels?.length > 0 && (
            <div className="demo-card-label-strips card-label-strips" aria-hidden="true">
              {task.labels.map((label) => (
                <span
                  className={`demo-card-label-strip card-label-strip ${label}`.trim()}
                  key={label}
                />
              ))}
            </div>
          )}

          {showHeader && (
            <div className="demo-card-header card-header">
              <span className="demo-card-id card-id">
                {task.priority && (
                  <span
                    className={`demo-card-priority ${priorityClass}`.trim()}
                    aria-label={`${task.priority} priority`}
                  />
                )}
                {task.code}
              </span>
              {task.dueDate && (
                <span className={`demo-card-due card-due ${task.dueStatus || ''}`.trim()}>
                  <Calendar size={10} aria-hidden="true" />
                  {task.dueDate}
                </span>
              )}
            </div>
          )}

          <div className="demo-card-title-row card-title-row">
            <h4 className="demo-card-title card-title">{task.title}</h4>
            <span className="demo-card-quick-edit card-quick-edit" aria-hidden="true">
              <Pencil size={12} />
            </span>
          </div>

          {visibleTags.length > 0 && (
            <div className="demo-card-tags tags">
              {visibleTags.map((tag) => (
                <span className="demo-card-tag tag type-label" key={tag}>{tag}</span>
              ))}
              {hiddenTagCount > 0 && (
                <span className="demo-card-tag tag type-label">+{hiddenTagCount}</span>
              )}
            </div>
          )}

          {hasFooter && (
            <div className="demo-card-footer card-footer">
              <div className="demo-card-metrics card-metrics">
                {task.metrics?.comments ? (
                  <span className="demo-card-metric metric active">
                    <MessageSquare size={12} aria-hidden="true" />
                    {task.metrics.comments}
                  </span>
                ) : null}
                {task.metrics?.attachments ? (
                  <span className="demo-card-metric metric active">
                    <Paperclip size={12} aria-hidden="true" />
                    {task.metrics.attachments}
                  </span>
                ) : null}
                {totalChecks ? (
                  <span className={`demo-card-metric metric active ${doneChecks === totalChecks ? 'done' : ''}`.trim()}>
                    <CheckSquare size={12} aria-hidden="true" />
                    {doneChecks}/{totalChecks}
                  </span>
                ) : null}
              </div>
              {task.assigneeName && (
                <div className="demo-card-assignees card-assignees">
                  <span className="demo-card-avatar avatar tiny">
                    {getInitials(task.assigneeName)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        );
      }}
    </Draggable>
  );
}

