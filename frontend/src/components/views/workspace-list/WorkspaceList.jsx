import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  X,
  ArrowRight,
  Users,
  Search,
  Sparkles,
  AlertTriangle,
  Bell,
  RotateCw,
  MessageSquare,
  Paperclip,
  ListChecks,
  ArrowRightLeft,
  Pencil,
  Building2,
  ListTodo,
  CheckCheck,
  Inbox,
  Eye,
  EyeOff,
  UserPlus,
} from 'lucide-react';
import { useWorkspaces } from '../../../hooks/useWorkspaces.js';
import { useAuth } from '../../../hooks/useAuth.js';
import { UserDropdown, Logo, Tooltip, Avatar } from '../../ui';
import { WorkspaceCardMenu } from './components/index.js';
import { apiGet, apiPost, resolveServerUrl } from '../../../api/client.js';
import { formatRelativeTime } from '../../../utils/time.js';
import {
  getReadIds,
  markNotificationRead,
  markNotificationsReadAll,
} from '../../../utils/notificationReadState.js';
import { ErrorState } from '../error';
import './css/workspacelist.css';

const ACTIVITY_PER_WORKSPACE = 6;
const ACTIVITY_FEED_CAP = 15;
const NOTIFICATION_EVENTS = new Set([
  'TASK_CREATED',
  'TASK_UPDATED',
  'TASK_MOVED',
  'COMMENT_ADDED',
  'ATTACHMENT_ADDED',
  'CHECKLIST_ADDED',
  'TASK_WATCHED',
  'TASK_UNWATCHED',
]);

function isNotificationEvent(item) {
  if (!NOTIFICATION_EVENTS.has(item.event)) return false;
  if (item.event !== 'TASK_UPDATED') return true;

  const detail = typeof item.detail === 'string' ? safeJson(item.detail) : item.detail;
  return Array.isArray(detail?.changes) && detail.changes.length > 0;
}

async function fetchWorkspaceActivityFeed(workspaceList, perWs, cap) {
  if (workspaceList.length === 0) {
    return { items: [], failedAllRejected: false };
  }
  const results = await Promise.allSettled(
    workspaceList.map(async (workspace) => {
      const data = await apiGet(`/workspaces/${workspace.id}/activity?limit=${perWs}`);
      return (data.activity || []).map((item) => ({
        ...item,
        workspaceName: workspace.name,
        workspaceId: workspace.id,
      }));
    }),
  );
  const failed = results.some((result) => result.status === 'rejected');
  const items = results
    .flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
    .filter(isNotificationEvent)
    .sort(
      (a, b) =>
        new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0),
    )
    .slice(0, cap);

  return { items, failedAllRejected: failed && items.length === 0 };
}

async function fetchNotificationBundle(workspaceList) {
  const [activity, inviteData] = await Promise.all([
    fetchWorkspaceActivityFeed(workspaceList, ACTIVITY_PER_WORKSPACE, ACTIVITY_FEED_CAP),
    apiGet('/workspaces/invites'),
  ]);
  return {
    activity,
    invites: inviteData?.invites || [],
  };
}

export default function WorkspaceList() {
  const { workspaces, addWorkspace, updateWorkspace, deleteWorkspace, error: listError, refetch: refetchWorkspaces } = useWorkspaces();
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [query, setQuery] = useState('');
  const [welcome, setWelcome] = useState(() => sessionStorage.getItem('Elevate-welcome') === '1');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [inviteNotifications, setInviteNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState(null);
  const notificationRef = useRef(null);
  const [, rerenderReads] = useState(0);
  const [respondingInviteId, setRespondingInviteId] = useState(null);

  const readIds = getReadIds(user?.id);

  const unreadCount = inviteNotifications.length + notifications.filter((n) => !readIds.has(n.id)).length;

  // Inline rename + delete modals. Holds the target workspace so the modal
  // can render its name without a separate state field.
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState(null);
  const [renaming, setRenaming] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (welcome) {
      sessionStorage.removeItem('Elevate-welcome');
      const timer = setTimeout(() => setWelcome(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [welcome]);

  const filtered = workspaces.filter(w =>
    w.name.toLowerCase().includes(query.toLowerCase())
  );

  const loadNotifications = useCallback(
    ({ showListSpinner = false } = {}) => {
      const run = fetchWorkspaceActivityFeed(
        workspaces,
        ACTIVITY_PER_WORKSPACE,
        ACTIVITY_FEED_CAP,
      );
      const bundle = Promise.all([run, apiGet('/workspaces/invites')]).then(([activity, inviteData]) => {
        setNotifications(activity.items);
        setInviteNotifications(inviteData?.invites || []);
        if (activity.failedAllRejected) setNotificationsError('Could not load notifications');
        else setNotificationsError(null);
      });

      if (showListSpinner) setNotificationsLoading(true);
      bundle
        .catch(() => {
          setNotificationsError('Could not load notifications');
        })
        .finally(() => {
          if (showListSpinner) setNotificationsLoading(false);
        });
    },
    [workspaces],
  );

  useEffect(() => {
    let cancelled = false;

    fetchNotificationBundle(workspaces)
      .then(({ activity, invites }) => {
        if (cancelled) return;
        setNotifications(activity.items);
        setInviteNotifications(invites);
        if (activity.failedAllRejected) setNotificationsError('Could not load notifications');
        else setNotificationsError(null);
      })
      .catch(() => {
        if (cancelled) return;
        setNotificationsError('Could not load notifications');
      });

    return () => {
      cancelled = true;
    };
  }, [workspaces]);

  useEffect(() => {
    if (!notificationsOpen) return undefined;
    function handleClickOutside(e) {
      if (!notificationRef.current?.contains(e.target)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notificationsOpen]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const newWs = await addWorkspace(newName.trim());
    navigate(`/workspace/${newWs.id}`);
  };

  const initials = (name) =>
    name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const describeNotification = (item) => {
    const actor = item.userName || 'Someone';
    const detail = typeof item.detail === 'string' ? safeJson(item.detail) : item.detail;
    const title =
      typeof detail?.title === 'string' && detail.title.trim()
        ? ` “${truncate(detail.title.trim(), 56)}”`
        : '';
    if (item.event === 'TASK_CREATED') return `${actor} created${title || ' a task'}`;
    if (item.event === 'TASK_MOVED') {
      const col = detail?.to ? ` → ${detail.to}` : '';
      return `${actor} moved a task${title}${col}`;
    }
    if (item.event === 'TASK_UPDATED') {
      const changes = Array.isArray(detail?.changes) ? detail.changes : [];
      if (changes.some((change) => change.field === 'assignee')) {
        return `${actor} changed assignment for a task${title}`;
      }
      return `${actor} updated a task${title}`;
    }
    if (item.event === 'COMMENT_ADDED') return `${actor} commented on a task${title}`;
    if (item.event === 'ATTACHMENT_ADDED') return `${actor} added an attachment${title}`;
    if (item.event === 'CHECKLIST_ADDED') return `${actor} added a checklist${title}`;
    if (item.event === 'TASK_WATCHED') return `${actor} started watching a task${title}`;
    if (item.event === 'TASK_UNWATCHED') return `${actor} stopped watching a task${title}`;
    if (item.event === 'WORKSPACE_UPDATED') return `${actor} updated the workspace`;
    return `${actor} changed ${item.entityType || 'workspace activity'}`;
  };

  const notificationIcon = (event) => {
    switch (event) {
      case 'COMMENT_ADDED':
        return MessageSquare;
      case 'ATTACHMENT_ADDED':
        return Paperclip;
      case 'CHECKLIST_ADDED':
        return ListChecks;
      case 'TASK_MOVED':
        return ArrowRightLeft;
      case 'TASK_UPDATED':
        return Pencil;
      case 'TASK_CREATED':
        return ListTodo;
      case 'TASK_WATCHED':
        return Eye;
      case 'TASK_UNWATCHED':
        return EyeOff;
      case 'WORKSPACE_UPDATED':
        return Building2;
      default:
        return Inbox;
    }
  };

  const navigateForNotification = (item) => {
    if (item.taskCode) {
      navigate(`/workspace/${item.workspaceId}/tasks/${item.taskCode}`);
      return;
    }
    navigate(`/workspace/${item.workspaceId}`);
  };

  const handleMarkAllRead = () => {
    if (!user?.id || notifications.length === 0) return;
    markNotificationsReadAll(
      user.id,
      notifications.map((n) => n.id),
    );
    rerenderReads((n) => n + 1);
  };

  const handleMarkOneRead = (activityId) => {
    if (!user?.id || !activityId) return;
    markNotificationRead(user.id, activityId);
    rerenderReads((n) => n + 1);
  };

  const handleNotificationClick = (item) => {
    if (user?.id) markNotificationRead(user.id, item.id);
    rerenderReads((n) => n + 1);
    setNotificationsOpen(false);
    navigateForNotification(item);
  };

  const handleInviteResponse = async (invite, action) => {
    setRespondingInviteId(invite.id);
    setNotificationsError(null);
    try {
      await apiPost(`/workspaces/invites/${invite.id}/${action}`, {});
      setInviteNotifications(prev => prev.filter(item => item.id !== invite.id));
      if (action === 'accept') {
        refetchWorkspaces();
      }
      // Close the panel so we don’t leave you staring at unrelated team activity
      // (the feed is workspace-wide, not “messages to you”) after handling an invite.
      setNotificationsOpen(false);
    } catch (err) {
      setNotificationsError(err.message || `Could not ${action} invite`);
    } finally {
      setRespondingInviteId(null);
    }
  };

  const openRename = (ws) => {
    setRenameTarget(ws);
    setRenameValue(ws.name);
    setRenameError(null);
  };

  const closeRename = () => {
    setRenameTarget(null);
    setRenameValue('');
    setRenameError(null);
    setRenaming(false);
  };

  const submitRename = async (e) => {
    e.preventDefault();
    const next = renameValue.trim();
    if (!next || !renameTarget) return;
    if (next === renameTarget.name) { closeRename(); return; }
    setRenaming(true);
    setRenameError(null);
    try {
      await updateWorkspace(renameTarget.id, { name: next });
      closeRename();
    } catch (err) {
      setRenameError(err.message || 'Could not rename workspace');
      setRenaming(false);
    }
  };

  const openDelete = (ws) => {
    setDeleteTarget(ws);
    setDeleteConfirm('');
    setDeleteError(null);
  };

  const closeDelete = () => {
    setDeleteTarget(null);
    setDeleteConfirm('');
    setDeleteError(null);
    setDeleting(false);
  };

  const submitDelete = async () => {
    if (!deleteTarget) return;
    if (deleteConfirm !== deleteTarget.name) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteWorkspace(deleteTarget.id);
      closeDelete();
    } catch (err) {
      setDeleteError(err.message || 'Could not delete workspace');
      setDeleting(false);
    }
  };

  return (
    <div className="wl-page">
      {/* Welcome toast */}
      {welcome && (
        <div className="wl-welcome-toast">
          <Sparkles size={16} />
          <span>Welcome back, {user?.name || 'Guest'}!</span>
          <button onClick={() => setWelcome(false)}><X size={14} /></button>
        </div>
      )}

      {/* Top navigation */}
      <nav className="wl-nav">
        <div className="wl-nav-brand">
          <Logo size={22} className="wl-brand-icon" />
          <span className="wl-brand-text">Elevate</span>
        </div>

        <div className="wl-nav-actions">
          <div className="wl-notifications" ref={notificationRef}>
            <Tooltip
              content={
                unreadCount > 0
                  ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}`
                  : 'Activity'
              }
            >
              <button
                type="button"
                className={`wl-nav-icon-btn wl-bell-wrap ${notificationsOpen ? 'is-open' : ''}`}
                aria-label={
                  unreadCount > 0
                    ? `Notifications, ${unreadCount} unread`
                    : 'Notifications'
                }
                aria-expanded={notificationsOpen}
                onClick={() => {
                  setNotificationsOpen((open) => {
                    const next = !open;
                    if (!open) loadNotifications({ showListSpinner: true });
                    return next;
                  });
                }}
              >
                <Bell size={16} />
                {unreadCount > 0 ? (
                  <span className="wl-bell-badge" aria-hidden="true">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                ) : null}
              </button>
            </Tooltip>
            {notificationsOpen && (
              <div className="wl-notification-popover">
                <div className="wl-notification-head">
                  <div className="wl-notification-head-copy">
                    <strong>Activity</strong>
                    <span>Updates from everyone in your workspaces</span>
                  </div>
                  <div className="wl-notification-head-actions">
                    {notifications.length > 0 && unreadCount > 0 ? (
                      <button
                        type="button"
                        className="wl-notification-markall"
                        onClick={handleMarkAllRead}
                      >
                        <CheckCheck size={14} />
                        Mark read
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="wl-notification-refresh"
                      onClick={() => loadNotifications({ showListSpinner: true })}
                      aria-label="Refresh notifications"
                      disabled={notificationsLoading}
                    >
                      <RotateCw size={13} className={notificationsLoading ? 'wl-spin' : ''} />
                    </button>
                  </div>
                </div>

                <div className="wl-notification-list">
                  {notificationsLoading && inviteNotifications.length === 0 && notifications.length === 0 && (
                    <div className="wl-notification-state">Loading updates…</div>
                  )}
                  {!notificationsLoading && notificationsError && (
                    <div className="wl-notification-state is-error">{notificationsError}</div>
                  )}
                  {!notificationsLoading && !notificationsError && inviteNotifications.length === 0 && notifications.length === 0 && (
                    <div className="wl-notification-state">
                      You are all caught up. New changes from your team will show up here.
                    </div>
                  )}
                  {inviteNotifications.map((invite) => (
                    <div key={invite.id} className="wl-invite-card">
                      <div className="wl-invite-icon" aria-hidden="true">
                        <UserPlus size={15} />
                      </div>
                      <div className="wl-invite-copy">
                        <strong>{invite.invitedByName || 'Someone'} invited you</strong>
                        <span>
                          Join {invite.workspaceName} as {invite.role}
                        </span>
                      </div>
                      <div className="wl-invite-actions">
                        <button
                          type="button"
                          className="wl-invite-btn"
                          onClick={() => handleInviteResponse(invite, 'reject')}
                          disabled={respondingInviteId === invite.id}
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          className="wl-invite-btn is-primary"
                          onClick={() => handleInviteResponse(invite, 'accept')}
                          disabled={respondingInviteId === invite.id}
                        >
                          Accept
                        </button>
                      </div>
                    </div>
                  ))}
                  {notifications.map((item) => {
                    const isUnread = !readIds.has(item.id);
                    const EventIcon = notificationIcon(item.event);
                    const when = item.createdAt || item.created_at;
                    return (
                      <div
                        key={item.id}
                        className={`wl-notification-item ${isUnread ? 'is-unread' : 'is-read'}`}
                      >
                        <button
                          type="button"
                          className="wl-notification-main"
                          onClick={() => handleNotificationClick(item)}
                        >
                          <div className="wl-notification-avatar">
                            <Avatar
                              src={resolveServerUrl(item.userAvatar)}
                              name={item.userName || 'User'}
                              seed={item.userId || item.userName}
                              size={36}
                              className="wl-notification-avatar-img"
                            />
                            <span className="wl-notification-type-icon" aria-hidden="true">
                              <EventIcon size={11} strokeWidth={2.25} />
                            </span>
                          </div>
                          <span className="wl-notification-body">
                            <span className="wl-notification-title-row">
                              {isUnread ? (
                                <span className="wl-notification-unread-dot" aria-hidden="true" />
                              ) : null}
                              <strong className="wl-notification-title">
                                {describeNotification(item)}
                              </strong>
                            </span>
                            <span className="wl-notification-meta">
                              <span className="wl-notification-ws">{item.workspaceName}</span>
                              <span className="wl-notification-sep" aria-hidden="true">
                                ·
                              </span>
                              <time dateTime={when}>{formatRelativeTime(when)}</time>
                            </span>
                          </span>
                        </button>
                        {isUnread ? (
                          <button
                            type="button"
                            className="wl-notification-read-action"
                            onClick={() => handleMarkOneRead(item.id)}
                            aria-label="Mark notification as read"
                          >
                            <CheckCheck size={14} />
                          </button>
                        ) : (
                          <span className="wl-notification-read-action is-done" aria-label="Read">
                            <CheckCheck size={14} />
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {notificationsLoading && notifications.length > 0 ? (
                    <div className="wl-notification-updating" aria-live="polite">
                      Refreshing…
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
          <UserDropdown user={user} onLogout={() => navigate('/')} />
        </div>
      </nav>

      {/* Main content */}
      <main className="wl-main">
        {/* Header */}
        <header className="wl-header">
          <div>
            <h1 className="wl-title">Workspaces</h1>
            <p className="wl-subtitle">Manage your teams and projects across all spaces.</p>
          </div>
          <button type="button" className="wl-header-create" onClick={() => setIsCreating(true)}>
            <Plus size={15} />
            New workspace
          </button>
        </header>

        <div className="wl-toolbar">
          <div className="wl-search">
            <Search size={15} className="wl-search-icon" />
            <input
              type="text"
              placeholder="Search workspaces..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && (
              <button type="button" className="wl-search-clear" onClick={() => setQuery('')} aria-label="Clear search">
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Cards */}
        {listError ? (
          <ErrorState
            error={listError}
            title="Couldn't load your workspaces"
            onRetry={refetchWorkspaces}
          />
        ) : (
          <>
            <div className="wl-section-header">
              <span>All workspaces</span>
              <span>{filtered.length} of {workspaces.length}</span>
            </div>

            <div className="wl-grid">
              {isCreating && (
                <div className="wl-card wl-create-form-card">
                  <form onSubmit={handleCreate} className="wl-form">
                    <div className="wl-form-head">
                      <h3>Create workspace</h3>
                      <button type="button" className="wl-form-close" onClick={() => { setIsCreating(false); setNewName(''); }}>
                        <X size={16} />
                      </button>
                    </div>
                    <div className="wl-form-field">
                      <label>Name</label>
                      <input
                        autoFocus
                        type="text"
                        placeholder="e.g. Design, Engineering..."
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                      />
                    </div>
                    <button type="submit" className="wl-form-submit" disabled={!newName.trim()}>
                      Create workspace
                    </button>
                  </form>
                </div>
              )}

              {filtered.map((ws) => (
                <Link
                  key={ws.id}
                  to={`/workspace/${ws.id}`}
                  className="wl-card"
                >
                  <div className="wl-card-top">
                    <div className="wl-card-identity">
                      <div className="wl-card-avatar">
                        {ws.logo ? (
                          <img
                            src={resolveServerUrl(ws.logo)}
                            alt=""
                            className="wl-card-avatar-img"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              // Fall back to initials if the URL ever 404s,
                              // so a deleted logo file can't break the card.
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.parentElement?.classList.add('wl-card-avatar-broken');
                            }}
                          />
                        ) : null}
                        <span className="wl-card-avatar-initials">{initials(ws.name)}</span>
                      </div>
                      <div className="wl-card-headline">
                        <h3 className="wl-card-name">{ws.name}</h3>
                        <p className="wl-card-meta">
                          <Users size={14} className="wl-card-meta-icon" aria-hidden />
                          <span>
                            {ws.members ?? 1} member{(ws.members ?? 1) !== 1 ? 's' : ''}
                          </span>
                        </p>
                      </div>
                    </div>
                    <WorkspaceCardMenu
                      workspace={ws}
                      onRename={openRename}
                      onDelete={openDelete}
                    />
                  </div>

                  <div className="wl-card-body">
                    {ws.description && (
                      <p className="wl-card-desc">{ws.description}</p>
                    )}
                  </div>

                  <div className="wl-card-footer">
                    <span>Open workspace</span>
                    <ArrowRight size={15} />
                  </div>
                </Link>
              ))}

              {filtered.length === 0 && !isCreating && (
                <div className="wl-empty">
                  <span>No workspaces found</span>
                  <button type="button" onClick={() => setQuery('')}>Clear search</button>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* ── Rename modal ─────────────────────────────────────────────── */}
      {renameTarget && (
        <div className="wl-modal-backdrop" onMouseDown={closeRename}>
          <div className="wl-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="wl-modal-head">
              <h3>Rename workspace</h3>
              <button type="button" className="wl-form-close" onClick={closeRename} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={submitRename} className="wl-form">
              <div className="wl-form-field">
                <label>Workspace name</label>
                <input
                  autoFocus
                  type="text"
                  value={renameValue}
                  onChange={(e) => { setRenameValue(e.target.value); setRenameError(null); }}
                  maxLength={100}
                  required
                />
              </div>
              {renameError && <p className="wl-modal-error">{renameError}</p>}
              <div className="wl-modal-actions">
                <button type="button" className="wl-btn-secondary" onClick={closeRename}>Cancel</button>
                <button
                  type="submit"
                  className="wl-form-submit"
                  disabled={renaming || !renameValue.trim() || renameValue.trim() === renameTarget.name}
                >
                  {renaming ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete confirmation modal ────────────────────────────────── */}
      {deleteTarget && (
        <div className="wl-modal-backdrop" onMouseDown={closeDelete}>
          <div className="wl-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="wl-modal-head">
              <h3>
                <AlertTriangle size={16} className="wl-modal-danger-icon" />
                Delete workspace
              </h3>
              <button type="button" className="wl-form-close" onClick={closeDelete} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <p className="wl-modal-body">
              This permanently deletes <strong>{deleteTarget.name}</strong>, all its boards, tasks,
              comments, and attachments. This cannot be undone.
            </p>
            <div className="wl-form-field">
              <label>Type <strong>{deleteTarget.name}</strong> to confirm</label>
              <input
                type="text"
                autoFocus
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={deleteTarget.name}
              />
            </div>
            {deleteError && <p className="wl-modal-error">{deleteError}</p>}
            <div className="wl-modal-actions">
              <button type="button" className="wl-btn-secondary" onClick={closeDelete}>Cancel</button>
              <button
                type="button"
                className="wl-btn-danger"
                onClick={submitDelete}
                disabled={deleting || deleteConfirm !== deleteTarget.name}
              >
                {deleting ? 'Deleting...' : 'I understand, delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function safeJson(value) {
  try {
    return JSON.parse(value || '{}');
  } catch {
    return {};
  }
}

function truncate(str, max) {
  if (str.length <= max) return str;
  return `${str.slice(0, Math.max(0, max - 1))}…`;
}
