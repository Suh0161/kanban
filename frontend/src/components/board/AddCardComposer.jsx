import { useRef, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { PRIORITIES } from '../../constants.js';
import Select from '../ui/Select.jsx';

export default function AddCardComposer({
  columnId,
  isOpen, onOpen, onClose,
  title, onTitleChange,
  priority, onPriorityChange,
  tags, onTagsChange,
  onSubmit
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button className="add-card-btn" onClick={onOpen}>
        <Plus size={14} /> Add a card
      </button>
    );
  }

  return (
    <div className="add-card-composer">
      <textarea
        ref={inputRef}
        className="composer-textarea"
        placeholder="Enter a title for this card..."
        value={title}
        onChange={e => onTitleChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmit(columnId);
          } else if (e.key === 'Escape') {
            onClose();
          }
        }}
        rows={2}
      />
      <div className="composer-meta">
        <div style={{ width: 120 }}>
          <Select 
            value={priority} 
            onChange={onPriorityChange}
            options={PRIORITIES.map(p => ({ value: p, label: p }))}
          />
        </div>
        <input
          className="composer-tags"
          placeholder="Tags, e.g. Bug, Exploit"
          value={tags}
          onChange={e => onTagsChange(e.target.value)}
        />
      </div>
      <div className="composer-actions">
        <button className="btn btn-primary btn-sm" onClick={() => onSubmit(columnId)}>Add card</button>
        <button className="btn-icon-small" onClick={onClose}><X size={14} /></button>
      </div>
    </div>
  );
}
