import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity } from 'lucide-react';
import { apiGetList } from '../../../../api/client.js';
import { formatRelativeTime, formatAbsoluteTime, parseServerTime } from '../../../../utils/time.js';
import { ErrorState } from '../../error';

const eventColors = {
  create: 'var(--color-blue)',
  delete: 'var(--color-red)',
  move: 'var(--accent-blue)',
  update: 'var(--accent-blue)',
  archive: 'var(--color-yellow)',
  restore: 'var(--color-yellow)',
  comment: 'var(--color-purple)',
};

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
      list.sort((a, b) => {
        const ta = parseServerTime(b.timestamp || b.created_at)?.getTime() ?? 0;
        const tb = parseServerTime(a.timestamp || a.created_at)?.getTime() ?? 0;
        return ta - tb;
      });
      setActivities(list);
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err);
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
        <ErrorState
          error={error}
          title="Couldn't load activity"
          onRetry={() => fetchActivity()}
          compact
        />
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
                <div className="settings-activity-time" title={formatAbsoluteTime(a.timestamp || a.created_at)}>
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
