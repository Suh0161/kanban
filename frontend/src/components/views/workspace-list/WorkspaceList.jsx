import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, X, ArrowRight, Users, Search, Sparkles, AlertTriangle } from 'lucide-react';
import { useWorkspaces } from '../../../hooks/useWorkspaces.js';
import { useAuth } from '../../../hooks/useAuth.js';
import { UserDropdown, Logo } from '../../ui';
import { WorkspaceCardMenu } from './components/index.js';
import { resolveServerUrl } from '../../../api/client.js';
import { ErrorState } from '../error';
import './css/workspacelist.css';

export default function WorkspaceList() {
  const { workspaces, addWorkspace, updateWorkspace, deleteWorkspace, error: listError, refetch: refetchWorkspaces } = useWorkspaces();
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [query, setQuery] = useState('');
  const [welcome, setWelcome] = useState(() => sessionStorage.getItem('Elevate-welcome') === '1');

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

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const newWs = await addWorkspace(newName.trim());
    navigate(`/workspace/${newWs.id}`);
  };

  const initials = (name) =>
    name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);

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
          <div className="wl-search">
            <Search size={15} className="wl-search-icon" />
            <input
              type="text"
              placeholder="Find a workspace..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
        </header>

        {/* Cards */}
        {listError ? (
          <ErrorState
            error={listError}
            title="Couldn't load your workspaces"
            onRetry={refetchWorkspaces}
          />
        ) : (
          <div className="wl-grid">
          {filtered.map((ws) => (
            <Link
              key={ws.id}
              to={`/workspace/${ws.id}`}
              className="wl-card"
            >
              <div className="wl-card-top">
                <div className="wl-card-avatar">
                  {ws.logo ? (
                    <img
                      src={resolveServerUrl(ws.logo)}
                      alt=""
                      className="wl-card-avatar-img"
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
                <WorkspaceCardMenu
                  workspace={ws}
                  onRename={openRename}
                  onDelete={openDelete}
                />
              </div>

              <div className="wl-card-body">
                <h3 className="wl-card-name">{ws.name}</h3>
                {ws.description && (
                  <p className="wl-card-desc">{ws.description}</p>
                )}
                <div className="wl-card-meta">
                  <Users size={13} />
                  <span>{ws.members ?? 1} member{(ws.members ?? 1) !== 1 ? 's' : ''}</span>
                </div>
              </div>

              <div className="wl-card-footer">
                <span>Open workspace</span>
                <ArrowRight size={15} />
              </div>
            </Link>
          ))}

          {/* Create card */}
          {!isCreating ? (
            <button className="wl-create" onClick={() => setIsCreating(true)}>
              <div className="wl-create-plus">
                <Plus size={24} />
              </div>
              <span className="wl-create-label">New workspace</span>
              <span className="wl-create-hint">Start a fresh team space</span>
            </button>
          ) : (
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
        </div>
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
