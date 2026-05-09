import { Search, X, Plus, ChevronRight, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import FilterPanel from '../ui/FilterPanel.jsx';

export default function Topbar({
  activeViewTitle,
  workspaceName,
  isBoardView,
  searchQuery, onSearchChange,
  filterOpen, onToggleFilter,
  filterPriorities, onTogglePriority,
  filterTags, onToggleTag,
  allTags, activeFilterCount,
  onNewIssue
}) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="breadcrumbs">
          <Link to="/workspace" className="breadcrumb-link">Workspaces</Link>
          <ChevronRight size={14} />
          <span>{workspaceName}</span>
          {!isBoardView && (
            <>
              <ChevronRight size={14} />
              <span>{activeViewTitle}</span>
            </>
          )}
        </div>
        <div className="divider"></div>
        <button className="btn btn-icon-small"><Lock size={14} /></button>
      </div>
      <div className="topbar-right">
        {isBoardView && (
          <>
            <div className="search-bar">
              <Search size={14} className="text-tertiary" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
              />
              {searchQuery && (
                <button className="btn-icon-small" onClick={() => onSearchChange('')} style={{ padding: 0 }}>
                  <X size={14} />
                </button>
              )}
            </div>

            <FilterPanel
              isOpen={filterOpen}
              onToggle={onToggleFilter}
              filterPriorities={filterPriorities}
              onTogglePriority={onTogglePriority}
              filterTags={filterTags}
              onToggleTag={onToggleTag}
              allTags={allTags}
              activeFilterCount={activeFilterCount}
            />
          </>
        )}

        <button className="btn btn-primary" onClick={onNewIssue}>
          <Plus size={14} /> New Issue
        </button>
      </div>
    </header>
  );
}
