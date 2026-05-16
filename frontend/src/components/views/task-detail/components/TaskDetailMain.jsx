import { useRef, useState, useMemo, useEffect } from 'react';
import {
  AlignLeft, Paperclip, MessageSquare, Upload, CheckSquare, Plus, Trash,
  SendHorizontal, Activity, X, Pencil,
} from 'lucide-react';
import { marked } from 'marked';
import Select from '../../../ui/Select.jsx';

// Configure marked for safe rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

export default function TaskDetailMain({
  task,
  customFieldsConfig = [],
  onUpdateDescription,
  onUpdateTask,
  onAddChecklist,
  onAddChecklistItem,
  onToggleChecklistItem,
  onUpdateChecklistItemCount,
  onDeleteChecklist,
  onDeleteChecklistItem,
  onFileSelect,
  onDeleteAttachment,
  onLightboxOpen,
  onAddComment,
}) {
  const [newCommentText, setNewCommentText] = useState('');
  const [dropActive, setDropActive] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [addingChecklist, setAddingChecklist] = useState(false);
  const [newItemTexts, setNewItemTexts] = useState({});
  const [activeTab, setActiveTab] = useState('comments');
  const [editingDesc, setEditingDesc] = useState(false);
  const fileInputRef = useRef(null);
  const descRef = useRef(null);

  const descriptionHtml = useMemo(() => {
    if (!task.description) return '';
    return marked.parse(task.description);
  }, [task.description]);

  const applyFormat = (prefix, suffix = prefix) => {
    const ta = descRef.current;
    if (!ta) return;
    const { selectionStart, selectionEnd } = ta;
    const text = task.description || '';
    const selected = text.slice(selectionStart, selectionEnd);
    const newText = text.slice(0, selectionStart) + prefix + selected + suffix + text.slice(selectionEnd);
    onUpdateDescription(task.id, newText);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(selectionStart + prefix.length, selectionEnd + prefix.length);
    }, 0);
  };

  const applyLinePrefix = (prefix) => {
    const ta = descRef.current;
    if (!ta) return;
    const { selectionStart, selectionEnd } = ta;
    const text = task.description || '';
    const lineStart = text.lastIndexOf('\n', selectionStart - 1) + 1;
    const newText = text.slice(0, lineStart) + prefix + text.slice(lineStart);
    onUpdateDescription(task.id, newText);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(selectionStart + prefix.length, selectionEnd + prefix.length);
    }, 0);
  };

  const handleSubmitChecklist = (e) => {
    e.preventDefault();
    if (!newChecklistTitle.trim()) return;
    onAddChecklist(task.id, newChecklistTitle.trim());
    setNewChecklistTitle('');
    setAddingChecklist(false);
  };

  const handleAddItem = (checklistId) => {
    const text = newItemTexts[checklistId] || '';
    if (!text.trim()) return;
    const countStr = newItemTexts[`${checklistId}-count`] || '';
    const targetCount = parseInt(countStr, 10) || 1;
    onAddChecklistItem(task.id, checklistId, text.trim(), targetCount);
    setNewItemTexts(prev => ({ ...prev, [checklistId]: '', [`${checklistId}-count`]: '' }));
  };

  return (
    <div className="task-detail-main">
      {/* Description */}
      <section className="task-detail-section">
        <div className="section-header-row">
          <span className="task-detail-section-label"><AlignLeft size={14} /> Description</span>
          {!editingDesc && task.description && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                setEditingDesc(true);
                setTimeout(() => {
                  if (descRef.current) {
                    descRef.current.focus();
                    descRef.current.style.height = 'auto';
                    descRef.current.style.height = descRef.current.scrollHeight + 'px';
                  }
                }, 0);
              }}
            >
              <Pencil size={12} /> Edit
            </button>
          )}
        </div>

        {editingDesc || !task.description ? (
          <div className="task-detail-desc-wrap">
            <div className="desc-format-toolbar-static">
              <button type="button" title="Bold (Ctrl+B)" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('**')}><strong>B</strong></button>
              <button type="button" title="Italic (Ctrl+I)" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('_')}><em>I</em></button>
              <button type="button" title="Heading" onMouseDown={(e) => e.preventDefault()} onClick={() => applyLinePrefix('## ')}>H</button>
              <button type="button" title="Code" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('`')}>{'<>'}</button>
              <button type="button" title="Link" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('[', '](url)')}>🔗</button>
              <button type="button" title="Bullet list" onMouseDown={(e) => e.preventDefault()} onClick={() => applyLinePrefix('- ')}>•</button>
              <span className="desc-toolbar-divider" />
              <span className="desc-toolbar-hint">Markdown supported</span>
              {task.description && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm desc-done-btn"
                  onClick={() => setEditingDesc(false)}
                >
                  Done
                </button>
              )}
            </div>
            <textarea
              ref={descRef}
              className="task-detail-desc-input"
              placeholder="Add a more detailed description..."
              value={task.description || ''}
              autoFocus={editingDesc}
              onChange={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
                onUpdateDescription(task.id, e.target.value);
              }}
              onFocus={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
            />
          </div>
        ) : (
          <div
            className="task-detail-desc-rendered"
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />
        )}
      </section>

      {/* Custom fields */}
      {customFieldsConfig.length > 0 && (
        <section className="task-detail-section">
          <span className="task-detail-section-label"><AlignLeft size={14} /> Custom Fields</span>
          <div className="custom-fields-grid">
            {customFieldsConfig.map((field) => (
              <div key={field.name} className="custom-field">
                <label>{field.name}</label>
                {field.type === 'text' && (
                  <input
                    type="text"
                    className="form-input"
                    value={task.customFields?.[field.name] || ''}
                    onChange={e => onUpdateTask(task.id, {
                      customFields: { ...task.customFields, [field.name]: e.target.value }
                    })}
                  />
                )}
                {field.type === 'number' && (
                  <input
                    type="number"
                    className="form-input"
                    value={task.customFields?.[field.name] || ''}
                    onChange={e => onUpdateTask(task.id, {
                      customFields: { ...task.customFields, [field.name]: e.target.value }
                    })}
                  />
                )}
                {field.type === 'date' && (
                  <input
                    type="date"
                    className="date-input"
                    value={task.customFields?.[field.name] || ''}
                    onChange={e => onUpdateTask(task.id, {
                      customFields: { ...task.customFields, [field.name]: e.target.value }
                    })}
                  />
                )}
                {field.type === 'dropdown' && (
                  <Select
                    value={task.customFields?.[field.name] || ''}
                    onChange={val => onUpdateTask(task.id, {
                      customFields: { ...task.customFields, [field.name]: val }
                    })}
                    options={[
                      { value: '', label: 'None' },
                      ...(field.options || []).map(opt => ({ value: opt, label: opt }))
                    ]}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Checklists */}
      <section className="task-detail-section">
        <div className="section-header-row">
          <span className="task-detail-section-label"><CheckSquare size={14} /> Checklists</span>
          <button className="btn btn-outline btn-sm" onClick={() => setAddingChecklist(true)}>
            <Plus size={12} /> Add list
          </button>
        </div>

        {addingChecklist && (
          <form onSubmit={handleSubmitChecklist} className="checklist-add-form">
            <input
              className="form-input"
              autoFocus
              placeholder="Checklist title..."
              value={newChecklistTitle}
              onChange={e => setNewChecklistTitle(e.target.value)}
            />
            <div className="form-actions-row">
              <button type="submit" className="btn btn-primary btn-sm">Add</button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setAddingChecklist(false)}>Cancel</button>
            </div>
          </form>
        )}

        {(task.checklists || []).map(cl => {
          // Progress: sum currentCount / sum targetCount for accurate counter-aware progress
          const totalTarget = cl.items.reduce((acc, i) => acc + (i.targetCount || 1), 0);
          const totalCurrent = cl.items.reduce((acc, i) => acc + (i.currentCount || (i.done ? (i.targetCount || 1) : 0)), 0);
          const pct = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;
          const doneCount = cl.items.filter(i => i.done).length;
          return (
            <div key={cl.id} className="checklist">
              <div className="checklist-header">
                <span className="checklist-title">{cl.title}</span>
                <div className="checklist-actions">
                  <span className="checklist-progress-text">{doneCount}/{cl.items.length}</span>
                  <button className="btn-icon-small" onClick={() => onDeleteChecklist(task.id, cl.id)} title="Delete checklist">
                    <Trash size={14} />
                  </button>
                </div>
              </div>
              {cl.items.length > 0 && (
                <div className="checklist-bar">
                  <div className="checklist-bar-fill" style={{ width: `${pct}%` }} />
                </div>
              )}
              {cl.items.map(item => {
                const isCounter = (item.targetCount || 1) > 1;
                return isCounter ? (
                  <div key={item.id} className="checklist-item checklist-item-counter">
                    <span className={`checklist-item-text ${item.done ? 'item-done' : ''}`}>{item.text}</span>
                    <div className="checklist-counter">
                      <button
                        type="button"
                        className="counter-btn"
                        disabled={item.currentCount <= 0}
                        onClick={() => onUpdateChecklistItemCount(task.id, cl.id, item.id, (item.currentCount || 0) - 1)}
                      >−</button>
                      <span className="counter-value">{item.currentCount || 0}/{item.targetCount}</span>
                      <button
                        type="button"
                        className="counter-btn"
                        disabled={item.currentCount >= item.targetCount}
                        onClick={() => onUpdateChecklistItemCount(task.id, cl.id, item.id, (item.currentCount || 0) + 1)}
                      >+</button>
                    </div>
                    <button
                      type="button"
                      className="checklist-item-delete"
                      title="Delete item"
                      onClick={() => onDeleteChecklistItem(task.id, cl.id, item.id)}
                    ><X size={12} /></button>
                  </div>
                ) : (
                  <label key={item.id} className="checklist-item">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => onToggleChecklistItem(task.id, cl.id, item.id)}
                    />
                    <span className={item.done ? 'item-done' : ''}>{item.text}</span>
                    <button
                      type="button"
                      className="checklist-item-delete"
                      title="Delete item"
                      onClick={(e) => { e.preventDefault(); onDeleteChecklistItem(task.id, cl.id, item.id); }}
                    ><X size={12} /></button>
                  </label>
                );
              })}
              <div className="checklist-add-item">
                <input
                  className="comment-input"
                  placeholder="Add an item..."
                  value={newItemTexts[cl.id] || ''}
                  onChange={e => setNewItemTexts(prev => ({ ...prev, [cl.id]: e.target.value }))}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); handleAddItem(cl.id); }
                  }}
                />
                <input
                  type="number"
                  className="checklist-count-input"
                  placeholder="×"
                  min="1"
                  title="Target count (leave empty for checkbox)"
                  value={newItemTexts[`${cl.id}-count`] || ''}
                  onChange={e => setNewItemTexts(prev => ({ ...prev, [`${cl.id}-count`]: e.target.value }))}
                />
                <button className="btn btn-outline btn-sm" onClick={() => handleAddItem(cl.id)}>Add</button>
              </div>
            </div>
          );
        })}
      </section>

      {/* Attachments */}
      <section className="task-detail-section">
        <span className="task-detail-section-label"><Paperclip size={14} /> Attachments ({task.attachments?.length || 0})</span>
        <div className="attachments-grid">
          {(task.attachments || []).map(att => (
            <div key={att.id} className="attachment-thumb">
              <img src={att.url} alt={att.name} onClick={() => onLightboxOpen(att.url)} />
              <span className="attachment-name" onClick={() => onLightboxOpen(att.url)}>{att.name}</span>
              <button
                className="attachment-delete-btn"
                onClick={(e) => { e.stopPropagation(); onDeleteAttachment(task.id, att.id); }}
                title="Delete attachment"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
        <div
          className={`attachment-dropzone ${dropActive ? 'active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDropActive(true); }}
          onDragLeave={() => setDropActive(false)}
          onDrop={(e) => { e.preventDefault(); setDropActive(false); onFileSelect(e.dataTransfer.files, task.id); }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="image/*"
            multiple
            onChange={(e) => onFileSelect(e.target.files, task.id)}
          />
          <Upload size={18} />
          <span>Drop images here or click to browse</span>
        </div>
      </section>

      {/* Comments / Activity */}
      <section className="task-detail-section">
        <div className="task-detail-tabs">
          <button
            type="button"
            className={`task-detail-tab ${activeTab === 'comments' ? 'active' : ''}`}
            onClick={() => setActiveTab('comments')}
          >
            <MessageSquare size={15} /> Comments ({task.comments?.length || 0})
          </button>
          <button
            type="button"
            className={`task-detail-tab ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            <Activity size={15} /> Activity Feed
          </button>
        </div>

        {activeTab === 'comments' && (
          <div className="comments-list">
            <div className="comment-input-row" style={{ marginBottom: 16 }}>
              <img
                src="https://api.dicebear.com/7.x/lorelei/svg?seed=Felix"
                alt="You"
                className="avatar tiny"
              />
              <div className="comment-input-wrap">
                <input
                  className="comment-input"
                  placeholder="Write a comment..."
                  value={newCommentText}
                  onChange={e => setNewCommentText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      onAddComment(task.id, newCommentText);
                      setNewCommentText('');
                    }
                  }}
                />
                <button
                  type="button"
                  className="comment-send-btn"
                  onClick={() => { onAddComment(task.id, newCommentText); setNewCommentText(''); }}
                  disabled={!newCommentText.trim()}
                >
                  <SendHorizontal size={16} />
                </button>
              </div>
            </div>

            {(task.comments || []).slice().reverse().map(comment => (
              <div key={comment.id} className="comment">
                <img src={comment.avatar} alt={comment.author} className="avatar tiny" />
                <div className="comment-body">
                  <div className="comment-header">
                    <span className="comment-author">{comment.author}</span>
                    <span className="comment-time">{comment.time}</span>
                  </div>
                  <p className="comment-text">{comment.text}</p>
                </div>
              </div>
            ))}
            {(!task.comments || task.comments.length === 0) && (
              <div className="empty-state-text">No comments yet.</div>
            )}
          </div>
        )}

        {activeTab === 'activity' && (
          <ActivityFeed activities={task.activities || []} />
        )}
      </section>
    </div>
  );
}

const INITIAL_VISIBLE = 10;

function ActivityFeed({ activities }) {
  const [expanded, setExpanded] = useState(false);
  const [, setTick] = useState(0);
  const visible = expanded ? activities : activities.slice(0, INITIAL_VISIBLE);
  const hasMore = activities.length > INITIAL_VISIBLE;

  // Re-render every 60s to keep relative timestamps live
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  if (activities.length === 0) {
    return <div className="empty-state-text">No activity history yet.</div>;
  }

  return (
    <div className="activity-feed">
      {visible.map((activity) => (
        <div key={activity.id} className="activity-item">
          <div className="activity-icon">
            {activity.event === 'TASK_CREATED' && <Plus size={12} />}
            {activity.event === 'TASK_MOVED' && <Activity size={12} />}
            {activity.event === 'TASK_UPDATED' && <AlignLeft size={12} />}
          </div>
          <div className="activity-content">
            <ActivityDescription activity={activity} />
            <span className="activity-time">{formatRelativeTime(activity.time)}</span>
          </div>
        </div>
      ))}
      {hasMore && !expanded && (
        <button
          type="button"
          className="activity-show-more"
          onClick={() => setExpanded(true)}
        >
          Show {activities.length - INITIAL_VISIBLE} more entries
        </button>
      )}
    </div>
  );
}

function ActivityDescription({ activity }) {
  const name = <strong>{activity.userName}</strong>;
  const changes = activity.detail?.changes;

  if (activity.event === 'TASK_CREATED') {
    return <p>{name} created this task</p>;
  }

  if (activity.event === 'TASK_MOVED') {
    return (
      <p>{name} moved {activity.detail?.from} → {activity.detail?.to}</p>
    );
  }

  // TASK_UPDATED with field-level changes
  if (changes && changes.length > 0) {
    return (
      <div className="activity-changes">
        <p>{name} updated:</p>
        <ul className="activity-change-list">
          {changes.map((c, i) => (
            <li key={i}>{renderChange(c)}</li>
          ))}
        </ul>
      </div>
    );
  }

  // Fallback for old entries without changes array
  return <p>{name} updated this task</p>;
}

function renderChange(change) {
  const { field, from, to } = change;

  // Handle custom field changes
  if (field.startsWith('customField:')) {
    const fieldName = field.replace('customField:', '');
    if (!to) return <>removed {fieldName}</>;
    if (!from) return <>set {fieldName} to <span className="activity-val">{to}</span></>;
    return <>{fieldName} <span className="activity-val">{from}</span> → <span className="activity-val">{to}</span></>;
  }

  switch (field) {
    case 'priority':
      return <>priority <span className="activity-val">{from}</span> → <span className="activity-val">{to}</span></>;
    case 'title':
      return <>title</>;
    case 'description':
      return <>description</>;
    case 'dueDate':
      if (!to) return <>removed due date</>;
      if (!from) return <>set due date to <span className="activity-val">{to}</span></>;
      return <>due date <span className="activity-val">{from}</span> → <span className="activity-val">{to}</span></>;
    case 'assignee':
      if (!to) return <>unassigned</>;
      return <>assignee changed</>;
    case 'tags':
      return <>tags updated</>;
    case 'labels':
      return <>labels updated</>;
    default:
      return <>{field} changed</>;
  }
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}
