import { Search, X, Plus, ChevronRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { resolveServerUrl } from '../../api/client.js';
import FilterPanel from '../ui/FilterPanel.jsx';
import Avatar from '../ui/Avatar.jsx';
import Tooltip from '../ui/Tooltip.jsx';

export default function Topbar({
  activeViewTitle,
  breadcrumbTail,
  workspaceName,
  workspaceLogo,
  isBoardView,
  searchQuery, onSearchChange,
  filterOpen, onToggleFilter,
  filterPriorities, onTogglePriority,
  filterTags, onToggleTag,
  allTags, activeFilterCount,
  onNewIssue,
  isSearching,
  onlineUsers,
  canEdit = true,
}) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="breadcrumbs" data-onboarding="workspace-switch">
          <Link to="/workspace" className="breadcrumb-link">Workspaces</Link>
          <ChevronRight size={14} className="breadcrumb-sep" />
          <span className="breadcrumb-current breadcrumb-workspace">
            {workspaceLogo ? (
              <img src={resolveServerUrl(workspaceLogo)} alt="" className="breadcrumb-workspace-logo" />
            ) : null}
            {workspaceName}
          </span>
          {!isBoardView && (
            <>
              <ChevronRight size={14} className="breadcrumb-sep" />
              {breadcrumbTail ?? (
                <span className="breadcrumb-current">{activeViewTitle}</span>
              )}
            </>
          )}
        </div>
      </div>
      <div className="topbar-right">
        {isBoardView && (
          <div className="topbar-board-tools" data-onboarding="topbar-board-tools">
            <div className="topbar-search">
              <Search size={14} className="text-tertiary" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
              />
              {!searchQuery && !isSearching && (
                <kbd className="topbar-search-kbd">Ctrl+K</kbd>
              )}
              {isSearching && (
                <Loader2 size={14} className="topbar-search-spinner" />
              )}
              {searchQuery && !isSearching && (
                <button
                  type="button"
                  className="topbar-search-clear"
                  onClick={() => onSearchChange('')}
                  aria-label="Clear search"
                >
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
              buttonClassName="topbar-filter-button"
            />
          </div>
        )}

        {onlineUsers && onlineUsers.length > 0 && (
          <div className="topbar-presence">
            {onlineUsers.slice(0, 3).map(user => (
              <Tooltip key={user.userId} content={user.name || user.userId}>
                <Avatar
                  src={user.avatar}
                  name={user.name || user.userId}
                  alt={user.name || user.userId}
                  className="topbar-presence-avatar"
                />
              </Tooltip>
            ))}
            {onlineUsers.length > 3 && (
              <span className="topbar-presence-count">+{onlineUsers.length - 3}</span>
            )}
          </div>
        )}

        {canEdit && (
          <button type="button" className="btn btn-primary" data-onboarding="new-issue" onClick={onNewIssue}>
            <Plus size={14} /> New Issue
          </button>
        )}
      </div>
    </header>
  );
}
