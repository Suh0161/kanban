import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layers, Plus, X, ArrowRight, Users, Bell, Search, Sparkles } from 'lucide-react';
import { useWorkspaces } from '../../hooks/useWorkspaces.js';
import { useAuth } from '../../hooks/useAuth.js';
import { UserDropdown } from '../ui';

export default function WorkspaceList() {
  const { workspaces, addWorkspace } = useWorkspaces();
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [query, setQuery] = useState('');
  const [welcome, setWelcome] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionStorage.getItem('jokel-welcome')) {
      setWelcome(true);
      sessionStorage.removeItem('jokel-welcome');
      const timer = setTimeout(() => setWelcome(false), 4000);
      return () => clearTimeout(timer);
    }
  }, []);

  const filtered = workspaces.filter(w =>
    w.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const newWs = addWorkspace(newName.trim());
    navigate(`/workspace/${newWs.id}`);
  };

  const initials = (name) =>
    name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);

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
          <div className="wl-brand-icon">
            <Layers size={18} />
          </div>
          <span className="wl-brand-text">Jokel</span>
        </div>

        <div className="wl-nav-actions">
          <button className="wl-nav-btn">
            <Bell size={16} />
          </button>
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
        <div className="wl-grid">
          {filtered.map((ws) => (
            <Link
              key={ws.id}
              to={`/workspace/${ws.id}`}
              className="wl-card"
            >
              <div className="wl-card-top">
                <div className="wl-card-avatar">
                  {initials(ws.name)}
                </div>
                <div className="wl-card-menu">⋯</div>
              </div>

              <div className="wl-card-body">
                <h3 className="wl-card-name">{ws.name}</h3>
                <div className="wl-card-meta">
                  <Users size={13} />
                  <span>{ws.members || 1} member{ws.members !== 1 ? 's' : ''}</span>
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
      </main>
    </div>
  );
}
