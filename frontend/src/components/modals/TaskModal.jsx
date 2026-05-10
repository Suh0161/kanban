import { useState, useRef } from 'react';
import { X, Trash2, AlignLeft, Paperclip, MessageSquare, Upload, CheckSquare, Plus, Trash, SendHorizontal } from 'lucide-react';
import { TEAM_MEMBERS } from '../../utils/helpers.js';
import Select from '../ui/Select.jsx';
import { PRIORITIES } from '../../constants.js';

export default function TaskModal({
  task, columnTitle,
  onClose, onDelete,
  onUpdateDescription, onUpdateDueDate,
  onAddComment,
  onFileSelect,
  onDeleteAttachment,
  onLightboxOpen,
  onUpdateTask,
  onMoveTask,
  columns,
  columnOrder,
  onAddChecklist,
  onAddChecklistItem,
  onToggleChecklistItem,
  onDeleteChecklist,
}) {
  const [newCommentText, setNewCommentText] = useState('');
  const [dropActive, setDropActive] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [addingChecklist, setAddingChecklist] = useState(false);
  const [newItemTexts, setNewItemTexts] = useState({});
  const fileInputRef = useRef(null);

  const currentAssignee = TEAM_MEMBERS.find(m => m.id === task.assigneeId) || null;
  const statusOptions = columnOrder.map(columnId => ({
    value: columnId,
    label: columns[columnId].title
  }));
  const currentColumnId = columnOrder.find(columnId => columns[columnId].taskIds.includes(task.id));
  const tagValue = (task.tags || []).join(', ');

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
    onAddChecklistItem(task.id, checklistId, text.trim());
    setNewItemTexts(prev => ({ ...prev, [checklistId]: '' }));
  };

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal-content modal-content-wide" onMouseDown={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-info">
            <span className="modal-id">{task.code}</span>
            <input
              className="modal-title-input"
              value={task.title}
              onChange={e => onUpdateTask(task.id, { title: e.target.value })}
            />
          </div>
          <div className="modal-header-actions">
            <button className="btn-icon-small danger-hover" onClick={() => onDelete(task.id)} title="Delete">
              <Trash2 size={18} />
            </button>
            <button className="btn-icon-small" onClick={onClose}><X size={20} /></button>
          </div>
        </div>

        <div className="modal-body modal-body-cols">
          {/* ---- LEFT COLUMN: main content ---- */}
          <div className="modal-main">
            <div className="modal-section">
              <h4><AlignLeft size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'text-bottom' }} /> Description</h4>
              <textarea
                className="modal-desc-input"
                placeholder="Add a more detailed description..."
                value={task.description || ''}
                onChange={(e) => onUpdateDescription(task.id, e.target.value)}
              />
            </div>

            {/* Checklists */}
            <div className="modal-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h4><CheckSquare size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'text-bottom' }} /> Checklists</h4>
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
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button type="submit" className="btn btn-primary btn-sm">Add</button>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => setAddingChecklist(false)}>Cancel</button>
                  </div>
                </form>
              )}

              {(task.checklists || []).map(cl => {
                const done = cl.items.filter(i => i.done).length;
                const total = cl.items.length;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <div key={cl.id} className="checklist">
                    <div className="checklist-header">
                      <span className="checklist-title">{cl.title}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="checklist-progress-text">{done}/{total}</span>
                        <button className="btn-icon-small" onClick={() => onDeleteChecklist(task.id, cl.id)} title="Delete checklist">
                          <Trash size={14} />
                        </button>
                      </div>
                    </div>
                    {total > 0 && (
                      <div className="checklist-bar">
                        <div className="checklist-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                    {cl.items.map(item => (
                      <label key={item.id} className="checklist-item">
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() => onToggleChecklistItem(task.id, cl.id, item.id)}
                        />
                        <span className={item.done ? 'item-done' : ''}>{item.text}</span>
                      </label>
                    ))}
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
                      <button className="btn btn-outline btn-sm" onClick={() => handleAddItem(cl.id)}>Add</button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Attachments */}
            <div className="modal-section">
              <h4><Paperclip size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'text-bottom' }} /> Attachments ({task.attachments?.length || 0})</h4>
              <div className="attachments-grid">
                {(task.attachments || []).map(att => (
                  <div key={att.id} className="attachment-thumb">
                    <img src={att.url} alt={att.name} onClick={() => onLightboxOpen(att.url)} />
                    <span className="attachment-name" onClick={() => onLightboxOpen(att.url)}>{att.name}</span>
                    <button
                      className="attachment-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteAttachment(task.id, att.id);
                      }}
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
                <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" multiple onChange={(e) => onFileSelect(e.target.files, task.id)} />
                <Upload size={18} />
                <span>Drop images here or click to browse</span>
              </div>
            </div>

            {/* Comments */}
            <div className="modal-section">
              <h4><MessageSquare size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'text-bottom' }} /> Comments ({task.comments?.length || 0})</h4>
              <div className="comments-list">
                {(task.comments || []).map(comment => (
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
                <div className="comment-input-row">
                  <img src="https://api.dicebear.com/7.x/lorelei/svg?seed=Felix" alt="You" className="avatar tiny" />
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
                      className="comment-send-btn"
                      type="button"
                      onClick={() => { onAddComment(task.id, newCommentText); setNewCommentText(''); }}
                      disabled={!newCommentText.trim()}
                      aria-label="Send comment"
                      title="Send comment"
                    >
                      <SendHorizontal size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ---- RIGHT SIDEBAR: properties ---- */}
          <aside className="modal-sidebar">
            <div className="property">
              <span className="property-label">Status</span>
              <Select
                value={currentColumnId || ''}
                onChange={val => onMoveTask(task.id, val)}
                options={statusOptions}
              />
            </div>

            <div className="property">
              <span className="property-label">Priority</span>
              <Select
                value={task.priority}
                onChange={val => onUpdateTask(task.id, { priority: val })}
                options={PRIORITIES.map(p => ({ value: p, label: p }))}
              />
            </div>

            <div className="property">
              <span className="property-label">Assignee</span>
              <div className="assignee-picker">
                <Select
                  value={task.assigneeId || ''}
                  onChange={val => {
                    const member = TEAM_MEMBERS.find(m => m.id === val);
                    onUpdateTask(task.id, {
                      assigneeId: val || null,
                      assigneeName: member?.name || null,
                      assigneeImg: member?.avatar || null,
                    });
                  }}
                  options={[
                    { value: '', label: 'Unassigned' },
                    ...TEAM_MEMBERS.map(m => ({ value: m.id, label: m.name }))
                  ]}
                />
                {currentAssignee && (
                  <img src={currentAssignee.avatar} alt={currentAssignee.name} className="avatar tiny" style={{ marginTop: 8 }} />
                )}
              </div>
            </div>

            <div className="property">
              <span className="property-label">Due Date</span>
              <input
                type="date"
                className="date-input"
                value={task.dueDate || ''}
                onChange={(e) => onUpdateDueDate(task.id, e.target.value)}
              />
            </div>

            <div className="property">
              <span className="property-label">Tags</span>
              <input
                className="form-input"
                value={tagValue}
                onChange={e => onUpdateTask(task.id, {
                  tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                })}
                placeholder="Bug, Exploit"
              />
            </div>

            <div className="property">
              <span className="property-label">Current list</span>
              <span className="property-value">
                <span className="tag type-label">{columnTitle || 'Unknown'}</span>
              </span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
