/**
 * Three-dot menu on each workspace card.
 *
 * Rendered through a React portal so it isn't clipped by the card's
 * border-radius / overflow rules, and so it doesn't trigger the
 * surrounding `<Link>` when the user clicks an item.
 *
 * Actions:
 *   - Rename     (owner / admin only)
 *   - Copy link  (everyone)
 *   - Delete     (owner only)
 *
 * The trigger button stops mouse + click propagation so opening the
 * menu doesn't follow the card's link.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { can } from '../../../../hooks/useWorkspaces.js';

export default function WorkspaceCardMenu({ workspace, onRename, onDelete }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [copied, setCopied] = useState(false);

  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const myRole = workspace.myRole || 'member';
  const canManage = can.manage(myRole); // owner + admin
  const canDelete = can.delete(myRole); // owner only

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 180;
    const menuHeight = 140;
    const gap = 6;

    let top = rect.bottom + gap;
    let left = rect.right - menuWidth;

    // Flip up if there isn't room below
    if (top + menuHeight > window.innerHeight - 16) {
      top = rect.top - menuHeight - gap;
    }
    if (left < 8) left = 8;

    setPos({ top, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      const inTrigger = triggerRef.current?.contains(e.target);
      const inMenu = menuRef.current?.contains(e.target);
      if (!inTrigger && !inMenu) setOpen(false);
    }
    function handleKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    function handleScroll() {
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [open]);

  // Critical: stop mousedown so the underlying <Link> never sees the click
  // and stop click so navigation doesn't fire.
  const stop = (e) => {
    e.stopPropagation();
    e.preventDefault();
  };

  const handleToggle = (e) => {
    stop(e);
    setOpen((v) => !v);
  };

  const handleRename = (e) => {
    stop(e);
    setOpen(false);
    onRename?.(workspace);
  };

  const handleDelete = (e) => {
    stop(e);
    setOpen(false);
    onDelete?.(workspace);
  };

  const handleCopyLink = async (e) => {
    stop(e);
    try {
      const url = new URL(`/workspace/${workspace.id}`, window.location.origin).toString();
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 900);
    } catch {
      setOpen(false);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`wl-card-menu-btn ${open ? 'is-open' : ''}`}
        aria-label="Workspace actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onMouseDown={stop}
        onClick={handleToggle}
      >
        <MoreHorizontal size={16} />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          className="wl-card-menu-pop"
          role="menu"
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            zIndex: 9999,
            width: 180,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {canManage && (
            <button type="button" className="wl-card-menu-item" onClick={handleRename} role="menuitem">
              <Pencil size={13} /> Rename
            </button>
          )}
          <button type="button" className="wl-card-menu-item" onClick={handleCopyLink} role="menuitem">
            <Copy size={13} /> {copied ? 'Copied' : 'Copy link'}
          </button>
          {canDelete && (
            <>
              <div className="wl-card-menu-divider" />
              <button
                type="button"
                className="wl-card-menu-item is-danger"
                onClick={handleDelete}
                role="menuitem"
              >
                <Trash2 size={13} /> Delete workspace
              </button>
            </>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
