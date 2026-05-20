import { useCallback, useMemo, useState } from 'react';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Settings,
  ListTodo,
  Puzzle,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { LOGIN_PATH } from '../../config/urls.js';
import { UserDropdown, Avatar, Logo, Tooltip } from '../ui';

const STORAGE_PREFIX = 'Elevate-sidebar-groups-';

const DEFAULT_GROUPS = Object.freeze({
  planning: true,
  workspace: true,
});

const NAV_GROUPS = [
  {
    id: 'planning',
    label: 'Planning',
    childViewIds: ['boards', 'backlog', 'my-work'],
    children: [
      { id: 'boards', label: 'Board', icon: LayoutDashboard, onboarding: 'nav-boards', tooltipHint: 'Kanban view' },
      { id: 'backlog', label: 'Backlog', icon: ListTodo, onboarding: 'nav-backlog' },
      { id: 'my-work', label: 'My Work', icon: Briefcase, onboarding: 'nav-my-work' },
    ],
  },
  {
    id: 'workspace',
    label: 'Workspace',
    childViewIds: ['team', 'plugins', 'settings'],
    children: [
      { id: 'team', label: 'Team', icon: Users, onboarding: 'nav-team' },
      { id: 'plugins', label: 'Plugins', icon: Puzzle, onboarding: 'nav-plugins' },
      { id: 'settings', label: 'Settings', icon: Settings, onboarding: 'sidebar-settings' },
    ],
  },
];

function loadGroupState(workspaceId) {
  if (!workspaceId) return { ...DEFAULT_GROUPS };
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${workspaceId}`);
    if (!raw) return { ...DEFAULT_GROUPS };
    const p = JSON.parse(raw);
    return {
      planning: p.planning !== false,
      workspace: p.workspace !== false,
    };
  } catch {
    return { ...DEFAULT_GROUPS };
  }
}

const FLAT_LEAVES = NAV_GROUPS.flatMap((g) => g.children);

export default function Sidebar({
  workspaceId,
  isOpen,
  activeView,
  onSelectView,
  onToggle,
  onOpenSettings,
}) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [userGroupsOpen, setUserGroupsOpen] = useState(() => loadGroupState(workspaceId));

  const groupsOpen = useMemo(() => {
    const merged = { ...userGroupsOpen };
    for (const g of NAV_GROUPS) {
      if (g.childViewIds.includes(activeView)) {
        merged[g.id] = true;
      }
    }
    return merged;
  }, [userGroupsOpen, activeView]);

  const handleLogout = () => {
    logout();
    navigate(LOGIN_PATH);
  };

  const toggleGroup = useCallback(
    (groupId) => {
      setUserGroupsOpen((prev) => {
        const next = { ...prev, [groupId]: !prev[groupId] };
        if (workspaceId) {
          localStorage.setItem(`${STORAGE_PREFIX}${workspaceId}`, JSON.stringify(next));
        }
        return next;
      });
    },
    [workspaceId]
  );

  const renderLeafButton = ({ id, label, icon: Icon, onboarding, tooltipHint }) => {
    const tooltipContent = !isOpen ? label : (tooltipHint ?? undefined);

    return (
      <Tooltip key={id} content={tooltipContent} position="right">
        <button
          type="button"
          className={`nav-item nav-item-leaf ${activeView === id ? 'active' : ''}`}
          data-onboarding={onboarding}
          onClick={() => onSelectView(id)}
          aria-label={tooltipHint ? `${label}: ${tooltipHint}` : label}
          aria-current={activeView === id ? 'page' : undefined}
        >
          <Icon size={16} />
          <span className="nav-label">{label}</span>
        </button>
      </Tooltip>
    );
  };

  const ToggleIcon = isOpen ? PanelLeftClose : PanelLeftOpen;

  return (
    <aside className={`sidebar ${isOpen ? 'is-open' : 'is-collapsed'}`}>
      <div className="sidebar-header">
        <div className="logo">
          <Logo variant="wordmark" className="logo-wordmark" />
        </div>
        <Tooltip content={isOpen ? 'Collapse sidebar' : 'Expand sidebar'} position="right" className="sidebar-toggle-tooltip">
          <button
            type="button"
            className="sidebar-toggle"
            data-onboarding="sidebar-collapse"
            onClick={onToggle}
            aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <ToggleIcon size={16} />
          </button>
        </Tooltip>
      </div>
      <nav className="sidebar-nav" data-onboarding="sidebar-nav">
        {isOpen
          ? NAV_GROUPS.map((group) => {
              const expanded = groupsOpen[group.id];
              const panelId = `sidebar-group-panel-${group.id}`;
              const anyChildActive = group.childViewIds.includes(activeView);

              return (
                <div key={group.id} className="sidebar-group">
                  <button
                    type="button"
                    className={`sidebar-group-toggle ${anyChildActive ? 'has-active-child' : ''}`}
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    id={`sidebar-group-trigger-${group.id}`}
                    onClick={() => toggleGroup(group.id)}
                  >
                    {expanded ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
                    <span className="sidebar-group-label">{group.label}</span>
                  </button>
                  {expanded ? (
                    <ul className="sidebar-group-panel" id={panelId} role="list">
                      {group.children.map((leaf) => (
                        <li key={leaf.id} className="sidebar-group-leaf" role="presentation">
                          {renderLeafButton(leaf)}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })
          : FLAT_LEAVES.map((leaf) => renderLeafButton(leaf))}
      </nav>
      <div className="sidebar-footer">
        <div className="user-profile">
          {user ? (
            <UserDropdown
              user={user}
              onLogout={handleLogout}
              placement="top"
              onOpenSettings={onOpenSettings}
              fullRow
            />
          ) : (
            <div className="user-profile-guest">
              <Avatar name="Guest" alt="Guest" className="avatar" />
              <div className="user-info">
                <span className="user-name">Guest</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
