import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useClickOutside } from '../../hooks/useClickOutside.js';

const PRIORITIES = [
  { label: 'Critical', value: 'Critical', color: 'var(--color-red)' },
  { label: 'High', value: 'High', color: 'var(--color-orange)' },
  { label: 'Medium', value: 'Medium', color: 'var(--color-yellow)' },
  { label: 'Low', value: 'Low', color: 'var(--text-secondary)' },
];

export default function TaskCardContextMenu({
  task,
  position,
  columns,
  columnOrder,
  onClose,
  onChangePriority,
  onMoveTask,
  onDeleteTask,
  onOpenModal,
}) {
  const menuRef = useRef(null);
  const priorityRef = useRef(null);
  const moveRef = useRef(null);
  const closeTimeoutRef = useRef(null);
  const [adjustedPos, setAdjustedPos] = useState(position);
  const [hoveredSection, setHoveredSection] = useState(null);
  const [flyoutDirection, setFlyoutDirection] = useState('right');

  useClickOutside(menuRef, onClose);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let x = position.x;
    let y = position.y;

    if (x + rect.width > vw) x = vw - rect.width - 8;
    if (y + rect.height > vh) y = vh - rect.height - 8;
    if (x < 0) x = 8;
    if (y < 0) y = 8;

    setAdjustedPos({ x, y });
  }, [position]);

  const openFlyout = useCallback((section) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    const ref = section === 'priority' ? priorityRef.current : moveRef.current;
    if (ref) {
      const rect = ref.getBoundingClientRect();
      if (rect.right + 190 > window.innerWidth) {
        setFlyoutDirection('left');
      } else {
        setFlyoutDirection('right');
      }
    }
    setHoveredSection(section);
  }, []);

  const scheduleClose = useCallback(() => {
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredSection(null);
    }, 150);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const handleAction = useCallback((action) => {
    action();
    onClose();
  }, [onClose]);

  const handleMoveTo = (columnId) => {
    onMoveTask(task.id, columnId);
    onClose();
  };

  const handlePriority = (priority) => {
    onChangePriority(task.id, priority);
    onClose();
  };

  const orderedColumns = columnOrder
    .map(id => columns[id])
    .filter(Boolean);

  return createPortal(
    <div
      ref={menuRef}
      className="ctxmenu"
      style={{
        position: 'fixed',
        left: adjustedPos.x,
        top: adjustedPos.y,
        zIndex: 1000,
      }}
    >
      <button className="ctxmenu-item" onClick={() => handleAction(() => onOpenModal(task))}>
        Open Details
      </button>

      <div className="ctxmenu-divider" />

      <div
        className="ctxmenu-item ctxmenu-item--has-flyout"
        ref={priorityRef}
        onMouseEnter={() => openFlyout('priority')}
        onMouseLeave={scheduleClose}
      >
        Priority
        <span className="ctxmenu-flyout-arrow">{'\u25B8'}</span>
        {hoveredSection === 'priority' && (
          <div
            className={`ctxmenu-flyout ctxmenu-flyout--${flyoutDirection}`}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            {PRIORITIES.map(p => (
              <button
                key={p.value}
                className="ctxmenu-item ctxmenu-flyout-item"
                onClick={() => handlePriority(p.value)}
              >
                <span className="ctxmenu-dot" style={{ backgroundColor: p.color }} />
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        className="ctxmenu-item ctxmenu-item--has-flyout"
        ref={moveRef}
        onMouseEnter={() => openFlyout('move')}
        onMouseLeave={scheduleClose}
      >
        Move to
        <span className="ctxmenu-flyout-arrow">{'\u25B8'}</span>
        {hoveredSection === 'move' && (
          <div
            className={`ctxmenu-flyout ctxmenu-flyout--${flyoutDirection}`}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            {orderedColumns.map(col => (
              <button
                key={col.id}
                className="ctxmenu-item ctxmenu-flyout-item"
                onClick={() => handleMoveTo(col.id)}
              >
                {col.title}
                {task.columnId === col.id && (
                  <span className="ctxmenu-check">{'\u2713'}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="ctxmenu-divider" />

      <button
        className="ctxmenu-item ctxmenu-item--danger"
        onClick={() => handleAction(() => onDeleteTask(task.id))}
      >
        Delete
      </button>
    </div>,
    document.body
  );
}
