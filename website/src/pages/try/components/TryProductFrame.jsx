import { useEffect, useRef, useState } from 'react';
import {
  Briefcase,
  ChevronDown,
  ChevronRight,
  Filter,
  LayoutDashboard,
  ListTodo,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Puzzle,
  Search,
  Settings,
  Users,
  X,
} from 'lucide-react';
import Logo from '../../../components/ui/Logo.jsx';
import { TryDragBoundsContext } from '../TryDragBoundsContext.jsx';

const SIDEBAR_GROUPS = [
  {
    label: 'Planning',
    items: [
      { label: 'Board', icon: LayoutDashboard, active: true },
      { label: 'Backlog', icon: ListTodo },
      { label: 'My Work', icon: Briefcase },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { label: 'Team', icon: Users },
      { label: 'Plugins', icon: Puzzle },
      { label: 'Settings', icon: Settings },
    ],
  },
];

const FLAT_NAV_ITEMS = SIDEBAR_GROUPS.flatMap((group) => group.items);

/** Flat product frame + real app shell (no 3D tilt — breaks drag-drop). */
export default function TryProductFrame({ children, searchQuery = '', onSearchChange }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const dragBoundsRef = useRef(null);
  const searchInputRef = useRef(null);
  const ToggleIcon = sidebarOpen ? PanelLeftClose : PanelLeftOpen;

  useEffect(() => {
    function onKeyDown(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="try-stage">
      <div className="try-stage-glow" aria-hidden="true" />

      <div className="try-device">
        <TryDragBoundsContext value={dragBoundsRef}>
          <div className="try-device-shell" ref={dragBoundsRef}>
          <header className="try-device-chrome" aria-hidden="true">
            <span className="try-device-title">Elevate</span>
          </header>

          <div className="try-device-viewport">
            <div className="try-app-shell">
              <aside className={`try-sidebar${sidebarOpen ? '' : ' is-collapsed'}`}>
                <div className="try-sidebar-header">
                  <div className="try-sidebar-logo">
                    <Logo size={18} className="try-app-logo" />
                    <span className="try-sidebar-logo-text">Elevate</span>
                  </div>
                  <button
                    type="button"
                    className="try-sidebar-toggle"
                    onClick={() => setSidebarOpen((open) => !open)}
                    aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                  >
                    <ToggleIcon size={14} aria-hidden="true" />
                  </button>
                </div>

                <nav className="try-sidebar-nav" aria-label="Demo navigation">
                  {sidebarOpen
                    ? SIDEBAR_GROUPS.map((group) => (
                        <div className="try-sidebar-group" key={group.label}>
                          <div className={`try-sidebar-group-toggle${group.label === 'Planning' ? ' has-active-child' : ''}`}>
                            <ChevronDown size={12} aria-hidden="true" />
                            <span className="try-sidebar-group-label">{group.label}</span>
                          </div>
                          <div className="try-sidebar-group-panel">
                            {group.items.map(({ label, icon: Icon, active }) => (
                              <span
                                className={`try-nav-item${active ? ' active' : ''}`}
                                key={label}
                              >
                                <Icon size={14} aria-hidden="true" />
                                <span className="try-nav-label">{label}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      ))
                    : FLAT_NAV_ITEMS.map(({ label, icon: Icon, active }) => (
                        <span
                          className={`try-nav-item${active ? ' active' : ''}`}
                          key={label}
                          title={label}
                        >
                          <Icon size={14} aria-hidden="true" />
                          <span className="try-nav-label">{label}</span>
                        </span>
                      ))}
                </nav>

                <div className="try-sidebar-footer">
                  <span className="try-user-avatar">MK</span>
                  <span className="try-user-copy">
                    <span>Maya Kim</span>
                    <span>maya@elevate.local</span>
                  </span>
                </div>
              </aside>

              <div className="try-main-content">
                <header className="try-topbar">
                  <div className="try-breadcrumbs">
                    <span className="try-breadcrumb-link">Workspaces</span>
                    <ChevronRight size={13} className="try-breadcrumb-sep" />
                    <span className="try-breadcrumb-current">
                      <span className="try-workspace-logo">E</span>
                      Apex Engineering
                    </span>
                  </div>

                  <div className="try-topbar-right">
                    <div className="try-board-tools">
                      <label className="try-search">
                        <Search size={13} aria-hidden="true" />
                        <input
                          ref={searchInputRef}
                          type="search"
                          value={searchQuery}
                          onChange={(event) => onSearchChange?.(event.target.value)}
                          placeholder="Search tasks..."
                          aria-label="Search tasks"
                        />
                        {!searchQuery && (
                          <kbd className="try-search-kbd">Ctrl+K</kbd>
                        )}
                        {searchQuery ? (
                          <button
                            type="button"
                            className="try-search-clear"
                            onClick={() => onSearchChange?.('')}
                            aria-label="Clear search"
                          >
                            <X size={14} aria-hidden="true" />
                          </button>
                        ) : null}
                      </label>
                      <span className="try-filter-faux">
                        <Filter size={13} aria-hidden="true" />
                        <span>Filter</span>
                      </span>
                    </div>
                    <div className="try-presence">
                      <span>JL</span>
                      <span>SR</span>
                      <span>+2</span>
                    </div>
                    <span className="try-new-issue">
                      <Plus size={13} aria-hidden="true" />
                      New Issue
                    </span>
                  </div>
                </header>

                <div className="try-main-view">
                  <div className="try-demo-board">{children}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </TryDragBoundsContext>
      </div>
    </div>
  );
}
