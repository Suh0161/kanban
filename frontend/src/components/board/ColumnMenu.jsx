import { useRef } from 'react';
import { MoreHorizontal, Edit2, X, Trash2 } from 'lucide-react';
import { useClickOutside } from '../../hooks/useClickOutside.js';

export default function ColumnMenu({
  columnId,
  menuOpenCol, onToggleMenu,
  onRename, onClear, onDelete
}) {
  const menuRef = useRef(null);
  const isOpen = menuOpenCol === columnId;
  useClickOutside(menuRef, () => { if (isOpen) onToggleMenu(null); });

  return (
    <div style={{ position: 'relative' }} ref={menuRef}>
      <button
        className="btn-icon-small"
        onClick={() => onToggleMenu(isOpen ? null : columnId)}
      >
        <MoreHorizontal size={14} />
      </button>
      {isOpen && (
        <div className="dropdown-menu">
          <button onClick={() => onRename(columnId)}><Edit2 size={14} /> Rename list</button>
          <button onClick={() => onClear(columnId)}><X size={14} /> Clear all cards</button>
          <button className="danger" onClick={() => onDelete(columnId)}><Trash2 size={14} /> Delete list</button>
        </div>
      )}
    </div>
  );
}
