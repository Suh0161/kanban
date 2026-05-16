import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, User, Settings } from 'lucide-react';
import ProfileModal from '../views/profile/ProfileModal.jsx';

export default function UserDropdown({ user, onLogout, onOpenSettings, placement = 'bottom' }) {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  useLayoutEffect(() => {
    if (open && triggerRef.current && menuRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const menuRect = menuRef.current.getBoundingClientRect();
      const menuWidth = 240;
      const menuHeight = menuRect.height || 200;
      const gap = 8;

      let top, left;

      if (placement === 'top') {
        top = rect.top - menuHeight - gap;
      } else {
        const spaceBelow = window.innerHeight - rect.bottom;
        if (spaceBelow < menuHeight + gap && rect.top > menuHeight + gap) {
          top = rect.top - menuHeight - gap;
        } else {
          top = rect.bottom + gap;
        }
      }

      left = rect.left;
      if (left + menuWidth > window.innerWidth - 16) {
        left = rect.right - menuWidth;
      }
      if (left < 16) left = 16;

      setMenuStyle({ top, left });
    }
  }, [open, placement]);

  useEffect(() => {
    function handleClick(e) {
      const inTrigger = triggerRef.current?.contains(e.target);
      const inMenu = menuRef.current?.contains(e.target);
      if (!inTrigger && !inMenu) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => {
    setOpen(false);
    onLogout();
  };

  const handleProfile = () => {
    setOpen(false);
    setProfileOpen(true);
  };

  const handleSettings = () => {
    setOpen(false);
    onOpenSettings?.();
  };

  if (!user) return null;

  const menu = (
    <div
      ref={menuRef}
      className="user-dropdown-menu"
      style={{ position: 'fixed', zIndex: 9999, width: 240, ...menuStyle }}
    >
      {/* User identity */}
      <div className="user-dropdown-header">
        <img src={user.avatar} alt={user.name} className="user-dropdown-header-avatar" />
        <div className="user-dropdown-info">
          <span className="user-dropdown-name">{user.name}</span>
          <span className="user-dropdown-email">{user.email}</span>
        </div>
      </div>

      <div className="user-dropdown-divider" />

      <button type="button" className="user-dropdown-item" onClick={handleProfile}>
        <User size={14} /> Profile
      </button>

      {onOpenSettings && (
        <button type="button" className="user-dropdown-item" onClick={handleSettings}>
          <Settings size={14} /> Workspace settings
        </button>
      )}

      <div className="user-dropdown-divider" />

      <button type="button" className="user-dropdown-item user-dropdown-logout" onClick={handleLogout}>
        <LogOut size={14} /> Log out
      </button>
    </div>
  );

  return (
    <>
      <div className="user-dropdown" ref={triggerRef}>
        <button
          type="button"
          className="user-dropdown-trigger"
          onClick={() => setOpen(v => !v)}
          aria-haspopup="true"
          aria-expanded={open}
          title={user.name}
        >
          <img src={user.avatar} alt={user.name} className="user-dropdown-avatar" />
        </button>
        {open && createPortal(menu, document.body)}
      </div>

      {profileOpen && (
        <ProfileModal onClose={() => setProfileOpen(false)} />
      )}
    </>
  );
}
