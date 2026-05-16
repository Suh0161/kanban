import { useCallback, useEffect, useRef, useState } from 'react';
import { Webhook, Plus, Trash2, Pencil, Play, Copy, X, Check } from 'lucide-react';
import { apiGet, apiPost, apiPatch, apiDelete } from '../../../../api/client.js';

const AVAILABLE_EVENTS = [
  'Task Created',
  'Task Updated',
  'Task Moved',
  'Task Deleted',
  'Task Archived',
  'Task Restored',
  'Column Created',
  'Column Deleted',
  'Comment Added',
  'Checklist Created',
  'Checklist Deleted'
];

export default function SettingsWebhooks({ workspaceId }) {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState(new Set());
  const [active, setActive] = useState(true);
  const [newSecret, setNewSecret] = useState(null);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const mountedRef = useRef(true);

  const fetchWebhooks = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const data = await apiGet(`/workspaces/${workspaceId}/webhooks`);
      if (!mountedRef.current) return;
      setWebhooks(Array.isArray(data) ? data : (data?.webhooks || []));
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
    const timer = setTimeout(() => { fetchWebhooks(); }, 0);
    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
    };
  }, [fetchWebhooks]);

  const resetCreateForm = () => {
    setCreating(false);
    setUrl('');
    setEvents(new Set());
    setActive(true);
    setNewSecret(null);
    setCopied(false);
    setSubmitting(false);
  };

  const resetEditForm = () => {
    setEditing(null);
    setUrl('');
    setEvents(new Set());
    setActive(true);
    setNewSecret(null);
    setCopied(false);
    setSubmitting(false);
  };

  const startEdit = (webhook) => {
    setEditing(webhook.id);
    setUrl(webhook.url || '');
    const eventList = typeof webhook.events === 'string'
      ? webhook.events.split(',').map(e => e.trim()).filter(Boolean)
      : (Array.isArray(webhook.events) ? webhook.events : []);
    setEvents(new Set(eventList));
    setActive(webhook.active !== false);
  };

  const toggleEvent = (eventName) => {
    setEvents(prev => {
      const next = new Set(prev);
      if (next.has(eventName)) {
        next.delete(eventName);
      } else {
        next.add(eventName);
      }
      return next;
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!url.trim() || events.size === 0) return;
    setSubmitting(true);
    try {
      const body = {
        url: url.trim(),
        events: Array.from(events).join(','),
        active
      };
      const data = await apiPost(`/workspaces/${workspaceId}/webhooks`, body);
      if (data?.secret) {
        setNewSecret(data.secret);
      } else {
        resetCreateForm();
        fetchWebhooks();
      }
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!url.trim() || events.size === 0 || !editing) return;
    setSubmitting(true);
    try {
      const body = {
        url: url.trim(),
        events: Array.from(events).join(','),
        active
      };
      await apiPatch(`/workspaces/${workspaceId}/webhooks/${editing}`, body);
      resetEditForm();
      fetchWebhooks();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  const handleTest = async (webhookId) => {
    setTesting(webhookId);
    setTestResult(null);
    try {
      await apiPost(`/workspaces/${workspaceId}/webhooks/${webhookId}/test`, {});
      setTestResult({ id: webhookId, success: true });
    } catch (err) {
      setTestResult({ id: webhookId, success: false, message: err.message });
    } finally {
      setTesting(null);
      setTimeout(() => { setTestResult(null); }, 3000);
    }
  };

  const handleDelete = async (webhookId) => {
    try {
      await apiDelete(`/workspaces/${workspaceId}/webhooks/${webhookId}`);
      setWebhooks(prev => prev.filter(w => w.id !== webhookId));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCopySecret = async () => {
    if (!newSecret) return;
    try {
      await navigator.clipboard.writeText(newSecret);
      setCopied(true);
    } catch {
      // clipboard unavailable
    }
  };

  const handleDoneSecret = () => {
    resetCreateForm();
    fetchWebhooks();
  };

  const truncateUrl = (urlStr) => {
    if (!urlStr) return '';
    return urlStr.length > 60 ? urlStr.slice(0, 60) + '...' : urlStr;
  };

  const eventsCount = (webhook) => {
    if (typeof webhook.events === 'string') {
      return webhook.events.split(',').filter(Boolean).length;
    }
    return Array.isArray(webhook.events) ? webhook.events.length : 0;
  };

  if (loading) {
    return (
      <div className="settings-content-panel">
        <div className="settings-panel-header">
          <div>
            <h2 className="settings-panel-title">Webhooks</h2>
            <p className="settings-panel-desc">Receive notifications for workspace events</p>
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
          <h2 className="settings-panel-title">Webhooks</h2>
          <p className="settings-panel-desc">Receive notifications for workspace events</p>
        </div>
        {!creating && !newSecret && (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
            <Plus size={14} /> Add Webhook
          </button>
        )}
      </div>

      <div className="settings-form">
        {error && (
          <div className="settings-error-banner" style={{ color: 'var(--color-red)', fontSize: '0.9rem', padding: '8px 0' }}>
            {error}
          </div>
        )}

        {newSecret && (
          <div className="settings-key-reveal">
            <div className="settings-key-reveal-header">
              <Check size={20} style={{ color: 'var(--color-blue)' }} />
              <span>Webhook Created</span>
            </div>
            <p className="settings-key-reveal-warning">
              Copy this secret now. You won&apos;t be able to see it again.
            </p>
            <div className="settings-key-reveal-value">
              <code>{newSecret}</code>
              <button type="button" className="btn btn-outline btn-sm" onClick={handleCopySecret}>
                <Copy size={14} /> {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleDoneSecret} style={{ marginTop: 16 }}>
              Done
            </button>
          </div>
        )}

        {!newSecret && creating && (
          <form onSubmit={handleCreate} className="settings-create-form">
            <div className="settings-create-form-header">
              <Webhook size={18} />
              <span>Add Webhook</span>
              <button type="button" className="btn-icon-small" onClick={resetCreateForm} style={{ marginLeft: 'auto' }}>
                <X size={14} />
              </button>
            </div>
            <div className="settings-form-row">
              <span>Payload URL</span>
              <input
                className="settings-input"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://example.com/webhook"
                required
              />
            </div>
            <div className="settings-form-row">
              <span>Events</span>
              <div className="settings-events-grid">
                {AVAILABLE_EVENTS.map(eventName => (
                  <button
                    key={eventName}
                    type="button"
                    className={`settings-event-pill ${events.has(eventName) ? 'active' : ''}`}
                    onClick={() => toggleEvent(eventName)}
                  >
                    {eventName}
                  </button>
                ))}
              </div>
            </div>
            <div className="settings-form-toggle" style={{ padding: '12px 16px', marginBottom: 4 }}>
              <span>Active</span>
              <label className="settings-toggle">
                <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
                <span className="settings-toggle-slider" />
              </label>
            </div>
            <div className="settings-create-form-actions">
              <button type="button" className="btn btn-outline btn-sm" onClick={resetCreateForm}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || !url.trim() || events.size === 0}>
                {submitting ? 'Saving...' : 'Create Webhook'}
              </button>
            </div>
          </form>
        )}

        {!newSecret && !creating && webhooks.length === 0 && (
          <div className="settings-activity-empty" style={{ padding: '24px 0' }}>
            No webhooks configured yet. Add one to receive real-time event notifications.
          </div>
        )}

        {!newSecret && !creating && webhooks.length > 0 && (
          <div className="settings-key-list">
            {webhooks.map(webhook => {
              if (editing === webhook.id) {
                return (
                  <div key={webhook.id} className="settings-create-form-area" style={{ border: 'none', padding: 0 }}>
                    <form onSubmit={handleUpdate} className="settings-create-form">
                      <div className="settings-create-form-header">
                        <Webhook size={18} />
                        <span>Edit Webhook</span>
                        <button type="button" className="btn-icon-small" onClick={resetEditForm} style={{ marginLeft: 'auto' }}>
                          <X size={14} />
                        </button>
                      </div>
                      <div className="settings-form-row">
                        <span>Payload URL</span>
                        <input
                          className="settings-input"
                          value={url}
                          onChange={e => setUrl(e.target.value)}
                          placeholder="https://example.com/webhook"
                          required
                        />
                      </div>
                      <div className="settings-form-row">
                        <span>Events</span>
                        <div className="settings-events-grid">
                          {AVAILABLE_EVENTS.map(eventName => (
                            <button
                              key={eventName}
                              type="button"
                              className={`settings-event-pill ${events.has(eventName) ? 'active' : ''}`}
                              onClick={() => toggleEvent(eventName)}
                            >
                              {eventName}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="settings-form-toggle" style={{ padding: '12px 16px', marginBottom: 4 }}>
                        <span>Active</span>
                        <label className="settings-toggle">
                          <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
                          <span className="settings-toggle-slider" />
                        </label>
                      </div>
                      <div className="settings-create-form-actions">
                        <button type="button" className="btn btn-outline btn-sm" onClick={resetEditForm}>
                          Cancel
                        </button>
                        <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || !url.trim() || events.size === 0}>
                          {submitting ? 'Saving...' : 'Update Webhook'}
                        </button>
                      </div>
                    </form>
                  </div>
                );
              }
              const evtCount = eventsCount(webhook);
              const isActive = webhook.active !== false;
              const testState = testResult && testResult.id === webhook.id;

              return (
                <div key={webhook.id} className="settings-key-item">
                  <div className="settings-key-info">
                    <div className="settings-webhook-url">
                      <Webhook size={14} style={{ flexShrink: 0, color: 'var(--text-tertiary)' }} />
                      <span title={webhook.url}>{truncateUrl(webhook.url)}</span>
                    </div>
                    <div className="settings-key-meta">
                      <span className="settings-webhook-events-count">{evtCount} event{evtCount !== 1 ? 's' : ''}</span>
                      <span className={`settings-webhook-status ${isActive ? 'active' : 'inactive'}`}>
                        <span className="settings-webhook-dot" />
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                      {testState && (
                        <span style={{
                          fontSize: '0.8rem',
                          color: testState.success ? 'var(--color-blue)' : 'var(--color-red)',
                          marginLeft: 8
                        }}>
                          {testState.success ? 'Ping succeeded' : `Ping failed: ${testState.message}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="settings-key-actions">
                    <button
                      type="button"
                      className="btn btn-icon-small"
                      onClick={() => handleTest(webhook.id)}
                      disabled={testing === webhook.id}
                      title="Test webhook"
                    >
                      <Play size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-icon-small"
                      onClick={() => startEdit(webhook)}
                      title="Edit webhook"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-icon-small danger-hover"
                      onClick={() => handleDelete(webhook.id)}
                      title="Delete webhook"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
