import { X } from 'lucide-react';
import { PRIORITIES } from '../../constants.js';
import Select from '../ui/Select.jsx';

export default function NewIssueModal({
  isOpen, onClose,
  data,
  newIssue, setNewIssue,
  onSubmit
}) {
  if (!isOpen) return null;

  const update = (field, value) => setNewIssue(prev => ({ ...prev, [field]: value }));

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal-content" onMouseDown={e => e.stopPropagation()} style={{ width: 520 }}>
        <div className="modal-header">
          <div className="modal-header-info">
            <h2 className="modal-title">New Issue</h2>
          </div>
          <button className="btn-icon-small" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Title</label>
            <input
              className="form-input"
              placeholder="Issue title"
              value={newIssue.title}
              onChange={e => update('title', e.target.value)}
              autoFocus
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Priority</label>
              <Select 
                value={newIssue.priority} 
                onChange={val => update('priority', val)}
                options={PRIORITIES.map(p => ({ value: p, label: p }))}
              />
            </div>
            <div className="form-group">
              <label>List</label>
              <Select 
                value={newIssue.columnId} 
                onChange={val => update('columnId', val)}
                options={data.columnOrder.map(cid => ({ value: cid, label: data.columns[cid].title }))}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Due Date</label>
              <input type="date" className="form-input" value={newIssue.dueDate} onChange={e => update('dueDate', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Tags (comma separated)</label>
              <input className="form-input" placeholder="e.g. Bug, Exploit" value={newIssue.tags} onChange={e => update('tags', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea className="form-textarea" placeholder="Add a description..." rows={4} value={newIssue.description} onChange={e => update('description', e.target.value)} />
          </div>
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={onSubmit}>Create Issue</button>
          </div>
        </div>
      </div>
    </div>
  );
}
