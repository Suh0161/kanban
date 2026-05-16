import {
  Layers,
  LayoutDashboard,
  Briefcase,
  Users,
  Settings,
  ListTodo,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { UserDropdown } from '../ui';

export default function Sidebar({ isOpen, activeView, onSelectView, onToggle, onOpenSettings }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };
  const navItems = [
    { id: 'boards', label: 'Boards', icon: LayoutDashboard, onboarding: 'nav-boards' },
    { id: 'backlog', label: 'Backlog', icon: ListTodo, onboarding: 'nav-backlog' },
    { id: 'my-work', label: 'My Work', icon: Briefcase, onboarding: 'nav-my-work' },
    { id: 'team', label: 'Team', icon: Users, onboarding: 'nav-team' },
    { id: 'settings', label: 'Settings', icon: Settings, onboarding: 'sidebar-settings' }
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
          data-onboarding="sidebar-collapse"
          onClick={onToggle}
          aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <ToggleIcon size={16} />
        </button>
      </div>
      <nav className="sidebar-nav" data-onboarding="sidebar-nav">
        {navItems.map(({ id, label, icon: Icon, onboarding }) => (
          <button
            key={id}
            type="button"
            className={`nav-item ${activeView === id ? 'active' : ''}`}
            data-onboarding={onboarding}
            onClick={() => onSelectView(id)}
            title={!isOpen ? label : undefined}
            aria-label={label}
            aria-current={activeView === id ? 'page' : undefined}
          >
            <Icon size={16} />
            <span className="nav-label">{label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="user-profile">
          {user ? (
            <>
              <UserDropdown user={user} onLogout={handleLogout} placement="top" onOpenSettings={onOpenSettings} />
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
