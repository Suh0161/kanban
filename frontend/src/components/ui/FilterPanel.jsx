import { useRef } from 'react';
import { Filter } from 'lucide-react';
import { PRIORITIES } from '../../constants.js';
import { useClickOutside } from '../../hooks/useClickOutside.js';

export default function FilterPanel({
  isOpen, onToggle,
  filterPriorities, onTogglePriority,
  filterTags, onToggleTag,
  allTags, activeFilterCount
}) {
  const panelRef = useRef(null);
  useClickOutside(panelRef, () => { if (isOpen) onToggle(false); });

  return (
    <div style={{ position: 'relative' }} ref={panelRef}>
      <button
        className={`btn btn-outline ${activeFilterCount > 0 ? 'btn-active' : ''}`}
        onClick={() => onToggle(!isOpen)}
      >
        <Filter size={14} /> Filter {activeFilterCount > 0 && `(${activeFilterCount})`}
      </button>
      {isOpen && (
        <div className="filter-panel">
          <div className="filter-section">
            <h4>Priority</h4>
            <div className="filter-options">
              {PRIORITIES.map(p => (
                <label key={p} className="filter-option">
                  <input
                    type="checkbox"
                    checked={filterPriorities.includes(p)}
                    onChange={() => onTogglePriority(p)}
                  />
                  <span className={`dot priority-${p}`}></span>
                  {p}
                </label>
              ))}
            </div>
          </div>
          {allTags.length > 0 && (
            <div className="filter-section">
              <h4>Tags</h4>
              <div className="filter-options">
                {allTags.map(tag => (
                  <label key={tag} className="filter-option">
                    <input
                      type="checkbox"
                      checked={filterTags.includes(tag)}
                      onChange={() => onToggleTag(tag)}
                    />
                    {tag}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="filter-actions">
            <button className="btn btn-outline btn-sm" onClick={() => { onTogglePriority(null, true); onToggleTag(null, true); }}>Clear</button>
            <button className="btn btn-primary btn-sm" onClick={() => onToggle(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
