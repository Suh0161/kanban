import {
  Layers,
  LayoutDashboard,
  CheckSquare,
  Inbox,
  BarChart2,
  Users,
  Settings,
  ListTodo,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { UserDropdown } from '../ui';

export default function Sidebar({ isOpen, activeView, onSelectView, onToggle }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };
  const navItems = [
    { id: 'boards', label: 'Boards', icon: LayoutDashboard },
    { id: 'backlog', label: 'Backlog', icon: ListTodo },
    { id: 'my-tasks', label: 'My Tasks', icon: CheckSquare },
    { id: 'inbox', label: 'Inbox', icon: Inbox, badge: 3 },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const ToggleIcon = isOpen ? PanelLeftClose : PanelLeftOpen;

  return (
    <aside className={`sidebar ${isOpen ? 'is-open' : 'is-collapsed'}`}>
      <div className="sidebar-header">
        <div className="logo">
          <Layers className="logo-icon" size={18} />
          <span className="logo-text">Jokel</span>
        </div>
        <button
          type="button"
          className="sidebar-toggle"
          onClick={onToggle}
          aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <ToggleIcon size={16} />
        </button>
      </div>
      <nav className="sidebar-nav">
        {navItems.map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            type="button"
            className={`nav-item ${activeView === id ? 'active' : ''}`}
            onClick={() => onSelectView(id)}
            title={!isOpen ? label : undefined}
            aria-label={label}
            aria-current={activeView === id ? 'page' : undefined}
          >
            <Icon size={16} />
            <span className="nav-label">{label}</span>
            {badge && <span className="badge">{badge}</span>}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="user-profile">
          {user ? (
            <>
              <UserDropdown user={user} onLogout={handleLogout} placement="top" />
              <div className="user-info">
                <span className="user-name">{user.name}</span>
              </div>
            </>
          ) : (
            <>
              <img src="https://api.dicebear.com/7.x/notionists-neutral/png?seed=Guest" alt="Guest" className="avatar" />
              <div className="user-info">
                <span className="user-name">Guest</span>
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
