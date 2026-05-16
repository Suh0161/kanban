import { useCallback, useEffect, useRef, useState } from 'react';
import { Key, Copy, Trash2, Plus, X, Check } from 'lucide-react';
import { apiGet, apiPost, apiDelete } from '../../../../api/client.js';

const SCOPES_OPTIONS = [
  { value: 'read', label: 'Read only' },
  { value: 'read,write', label: 'Read & write' }
];

export default function SettingsApiKeys({ workspaceId }) {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState('read,write');
  const [newKeyExpires, setNewKeyExpires] = useState('');
  const [createdKey, setCreatedKey] = useState(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const mountedRef = useRef(true);

  const fetchKeys = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const data = await apiGet(`/workspaces/${workspaceId}/api-keys`);
      if (!mountedRef.current) return;
      setKeys(Array.isArray(data) ? data : (data?.keys || []));
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err.message);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [workspaceId]);

  useEffect(() => {
    mountedRef.current = true;
    const timer = setTimeout(() => { fetchKeys(); }, 0);
    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
    };
  }, [fetchKeys]);

  const resetCreateForm = () => {
    setCreating(false);
    setNewKeyName('');
    setNewKeyScopes('read,write');
    setNewKeyExpires('');
    setCreatedKey(null);
    setCopied(false);
    setSubmitting(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setSubmitting(true);
    try {
      const body = { name: newKeyName.trim(), scopes: newKeyScopes };
      if (newKeyExpires) body.expires_at = newKeyExpires;
      const data = await apiPost(`/workspaces/${workspaceId}/api-keys`, body);
      setCreatedKey(data);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!createdKey?.key) return;
    try {
      await navigator.clipboard.writeText(createdKey.key);
      setCopied(true);
    } catch {
      // clipboard unavailable
    }
  };

  const handleDone = () => {
    resetCreateForm();
    fetchKeys();
  };

  const handleRevoke = async (keyId) => {
    try {
      await apiDelete(`/workspaces/${workspaceId}/api-keys/${keyId}`);
      setKeys(prev => prev.filter(k => k.id !== keyId));
      setRevoking(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never expires';
    return new Date(dateStr).toLocaleDateString();
  };

  const formatLastUsed = (dateStr) => {
    if (!dateStr) return 'Never used';
    return new Date(dateStr).toLocaleDateString();
  };

  const keyPrefix = (key) => {
    if (key.prefix) return key.prefix;
    if (key.key_preview) return key.key_preview;
    return 'jokel_****';
  };

  if (loading) {
    return (
      <div className="settings-content-panel">
        <div className="settings-panel-header">
          <div>
            <h2 className="settings-panel-title">API Keys</h2>
            <p className="settings-panel-desc">Manage access tokens for external services</p>
          </div>
        </div>
        <div className="settings-form">
          <div className="settings-activity-empty">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-content-panel">
      <div className="settings-panel-header">
        <div>
          <h2 className="settings-panel-title">API Keys</h2>
          <p className="settings-panel-desc">Manage access tokens for external services</p>
        </div>
        {!creating && (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
            <Plus size={14} /> Generate API Key
          </button>
        )}
      </div>

      <div className="settings-form">
        {error && (
          <div className="settings-error-banner" style={{ color: 'var(--color-red)', fontSize: '0.9rem', padding: '8px 0' }}>
            {error}
          </div>
        )}

        {creating && (
          <div className="settings-create-form-area">
            {createdKey ? (
              <div className="settings-key-reveal">
                <div className="settings-key-reveal-header">
                  <Check size={20} style={{ color: 'var(--color-blue)' }} />
                  <span>API Key Created</span>
                </div>
                <p className="settings-key-reveal-warning">
                  Copy this key now. You won&apos;t be able to see it again.
                </p>
                <div className="settings-key-reveal-value">
                  <code>{createdKey.key}</code>
                  <button type="button" className="btn btn-outline btn-sm" onClick={handleCopy}>
                    <Copy size={14} /> {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <button type="button" className="btn btn-primary btn-sm" onClick={handleDone} style={{ marginTop: 16 }}>
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="settings-create-form">
                <div className="settings-create-form-header">
                  <Key size={18} />
                  <span>Generate New API Key</span>
                  <button type="button" className="btn-icon-small" onClick={resetCreateForm} style={{ marginLeft: 'auto' }}>
                    <X size={14} />
                  </button>
                </div>
                <div className="settings-form-row">
                  <span>Key name</span>
                  <input
                    className="settings-input"
                    value={newKeyName}
                    onChange={e => setNewKeyName(e.target.value)}
                    placeholder="e.g. CI/CD pipeline"
                    required
                  />
                </div>
                <div className="settings-form-row">
                  <span>Scopes</span>
                  <select
                    className="settings-input"
                    value={newKeyScopes}
                    onChange={e => setNewKeyScopes(e.target.value)}
                  >
                    {SCOPES_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="settings-form-row">
                  <span>Expiry date (optional)</span>
                  <input
                    className="settings-input"
                    type="date"
                    value={newKeyExpires}
                    onChange={e => setNewKeyExpires(e.target.value)}
                  />
                </div>
                <div className="settings-create-form-actions">
                  <button type="button" className="btn btn-outline btn-sm" onClick={resetCreateForm}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || !newKeyName.trim()}>
                    {submitting ? 'Creating...' : 'Create Key'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {!creating && keys.length === 0 && (
          <div className="settings-activity-empty" style={{ padding: '24px 0' }}>
            No API keys yet. Generate one to allow external services to access this workspace.
          </div>
        )}

        {!creating && keys.length > 0 && (
          <div className="settings-key-list">
            {keys.map(key => (
              <div key={key.id} className="settings-key-item">
                <div className="settings-key-info">
                  <div className="settings-key-name">{key.name}</div>
                  <div className="settings-key-prefix">
                    <Key size={12} />
                    <code>{keyPrefix(key)}</code>
                  </div>
                  <div className="settings-key-meta">
                    <span className={`settings-scope-badge ${key.scopes === 'read' ? 'scope-read' : 'scope-full'}`}>
                      {key.scopes || 'read,write'}
                    </span>
                    <span className="settings-key-last-used">Last used: {formatLastUsed(key.last_used_at)}</span>
                    <span className="settings-key-expires">Expires: {formatDate(key.expires_at)}</span>
                  </div>
                </div>
                <div className="settings-key-actions">
                  {revoking === key.id ? (
                    <div className="settings-key-revoke-confirm">
                      <span>Revoke &quot;{key.name}&quot;? Any service using this key will lose access.</span>
                      <div className="settings-key-revoke-actions">
                        <button type="button" className="btn btn-outline btn-sm" onClick={() => setRevoking(null)}>
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          style={{ backgroundColor: 'var(--color-red)', color: '#fff', border: 'none' }}
                          onClick={() => handleRevoke(key.id)}
                        >
                          Revoke
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" className="btn btn-icon-small danger-hover" onClick={() => setRevoking(key.id)} title="Revoke key">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
