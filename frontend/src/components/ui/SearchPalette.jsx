import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Calendar, Tag } from 'lucide-react';
import { isOverdue, isDueToday, formatDate } from '../../utils/helpers.js';
import './SearchPalette.css';

export default function SearchPalette({ tasks = {}, columns = {}, columnOrder = [], onSelectTask, onClose }) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const getColumnTitle = useCallback((taskId) => {
    for (const colId of columnOrder) {
      if (columns[colId]?.taskIds?.includes(taskId)) return columns[colId].title;
    }
    return '';
  }, [columns, columnOrder]);

  const results = query.trim().length < 1
    ? Object.values(tasks).slice(0, 8)
    : Object.values(tasks).filter(t => {
        const q = query.toLowerCase();
        return (
          t.title?.toLowerCase().includes(q) ||
          t.code?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.tags?.some(tag => tag.toLowerCase().includes(q))
        );
      }).slice(0, 12);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const handleSelect = (task) => {
    onSelectTask(task);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[activeIndex]) {
      e.preventDefault();
      handleSelect(results[activeIndex]);
    }
  };

  return createPortal(
    <div className="sp-overlay" onMouseDown={onClose}>
      <div className="sp-panel" onMouseDown={e => e.stopPropagation()}>
        <div className="sp-header">
          <Search size={16} className="sp-search-icon" />
          <input
            ref={inputRef}
            className="sp-input"
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search tasks, codes, tags..."
          />
          <button className="sp-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="sp-results" ref={listRef}>
          {results.length === 0 && query.trim() && (
            <div className="sp-empty">No tasks found for &ldquo;{query}&rdquo;</div>
          )}
          {results.map((task, i) => {
            const dueCls = isOverdue(task.dueDate) ? 'overdue' : isDueToday(task.dueDate) ? 'today' : '';
            return (
              <button
                key={task.id}
                data-index={i}
                className={`sp-result-row ${i === activeIndex ? 'is-active' : ''}`}
                onClick={() => handleSelect(task)}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <div className="sp-result-left">
                  <span className="sp-code">{task.code}</span>
                  <span className="sp-title">{task.title}</span>
                </div>
                <div className="sp-result-meta">
                  {task.dueDate && (
                    <span className={`sp-due ${dueCls}`}>
                      <Calendar size={11} /> {formatDate(task.dueDate)}
                    </span>
                  )}
                  {task.tags?.slice(0, 2).map(tag => (
                    <span key={tag} className="sp-tag"><Tag size={10} /> {tag}</span>
                  ))}
                  <span className={`sp-priority priority-${task.priority}`}>{task.priority}</span>
                  <span className="sp-column">{getColumnTitle(task.id)}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="sp-footer">
          <span><kbd>↑↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>Esc</kbd> close</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
