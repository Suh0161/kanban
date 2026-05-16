import { useRef, useEffect } from 'react';
import { Plus, X } from 'lucide-react';

export default function AddColumnComposer({
  isOpen, onOpen, onClose,
  title, onTitleChange, onSubmit
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button className="add-column-btn" onClick={onOpen}>
        <Plus size={14} /> Add another list
      </button>
    );
  }

  return (
    <div className="add-column-composer">
      <input
        ref={inputRef}
        className="composer-input"
        placeholder="Enter list title..."
        value={title}
        onChange={e => onTitleChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') onSubmit();
          if (e.key === 'Escape') onClose();
        }}
      />
      <div className="composer-actions">
        <button className="btn btn-primary btn-sm" onClick={onSubmit}>Add list</button>
        <button className="btn-icon-small" onClick={onClose}><X size={14} /></button>
      </div>
    </div>
  );
}
