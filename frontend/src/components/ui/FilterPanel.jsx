import { useRef } from 'react';
import { Filter } from 'lucide-react';
import { PRIORITIES } from '../../constants.js';
import { useClickOutside } from '../../hooks/useClickOutside.js';

export default function FilterPanel({
  isOpen, onToggle,
  filterPriorities, onTogglePriority,
  filterTags, onToggleTag,
  allTags, activeFilterCount,
  buttonClassName = 'btn btn-outline'
}) {
  const panelRef = useRef(null);
  useClickOutside(panelRef, () => { if (isOpen) onToggle(false); });

  return (
    <div className="filter-popover" ref={panelRef}>
      <button
        type="button"
        className={`${buttonClassName} ${activeFilterCount > 0 ? 'is-active' : ''}`}
        onClick={() => onToggle(!isOpen)}
        aria-expanded={isOpen}
      >
        <Filter size={14} />
        <span>Filter</span>
        {activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}
      </button>
      {isOpen && (
        <div className="filter-panel">
          <div className="filter-panel-header">
            <div>
              <strong>Board filters</strong>
              <span>{activeFilterCount > 0 ? `${activeFilterCount} active` : 'No active filters'}</span>
            </div>
          </div>
          <div className="filter-section">
            <h4>Priority</h4>
            <div className="filter-options">
              {PRIORITIES.map(p => (
                <label key={p} className="filter-option filter-pill">
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
              <div className="filter-options filter-options-tags">
                {allTags.map(tag => (
                  <label key={tag} className="filter-option filter-chip">
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
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => { onTogglePriority(null, true); onToggleTag(null, true); }}
              disabled={activeFilterCount === 0}
            >
              Clear
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => onToggle(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
