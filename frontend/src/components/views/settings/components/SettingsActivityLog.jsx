import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity } from 'lucide-react';
import { apiGetList } from '../../../../api/client.js';

const eventColors = {
  create: 'var(--color-blue)',
  delete: 'var(--color-red)',
  move: 'var(--accent-blue)',
  update: 'var(--accent-blue)',
  archive: 'var(--color-yellow)',
  restore: 'var(--color-yellow)',
  comment: 'var(--color-purple)',
};

function formatRelativeTime(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getEventColor(type) {
  const key = (type || '').toLowerCase();
  return eventColors[key] || 'var(--text-secondary)';
}

export default function SettingsActivityLog({ workspaceId }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const fetchActivity = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const data = await apiGetList(`/workspaces/${workspaceId}/activity`, { limit: '30' });
      if (!mountedRef.current) return;
      const list = Array.isArray(data) ? data : (data?.activities || []);
      list.sort((a, b) => new Date(b.timestamp || b.created_at) - new Date(a.timestamp || a.created_at));
      setActivities(list);
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
    const timer = setTimeout(() => { fetchActivity(); }, 0);
    const interval = setInterval(fetchActivity, 30000);
    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchActivity]);

  return (
    <aside className="settings-sidebar-card">
      <div className="settings-sidebar-header">
        <Activity size={18} />
        <h2 className="settings-sidebar-title">Recent Activity</h2>
      </div>

      {loading && (
        <div className="settings-activity-empty">Loading...</div>
      )}

      {error && (
        <div className="settings-activity-empty" style={{ color: 'var(--color-red)' }}>{error}</div>
      )}

      {!loading && !error && activities.length === 0 && (
        <div className="settings-activity-empty">No recent activity</div>
      )}

      {!loading && !error && activities.length > 0 && (
        <div className="settings-activity-list">
          {activities.map((a, i) => (
            <div key={a.id || i} className="settings-activity-item">
              <div className="settings-activity-dot">
                <Activity size={12} />
              </div>
              <div className="settings-activity-content">
                <div className="settings-activity-badge" style={{
                  backgroundColor: `color-mix(in srgb, ${getEventColor(a.event_type || a.eventType || a.type)} 15%, transparent)`,
                  color: getEventColor(a.event_type || a.eventType || a.type)
                }}>
                  {a.event_type || a.eventType || a.type}
                </div>
                <div className="settings-activity-text">
                  {(a.entity_type || a.entityType || '')}: {a.entity_name || a.entityName || a.name || ''}
                </div>
                <div className="settings-activity-time">
                  {formatRelativeTime(a.timestamp || a.created_at)}
                  {a.user_name || a.userName ? ` \u00b7 ${a.user_name || a.userName}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
