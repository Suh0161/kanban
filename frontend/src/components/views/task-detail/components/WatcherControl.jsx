/**
 * Watch / Unwatch control + watcher avatar pile.
 *
 * Loads the watcher list lazily on first mount, lets the calling user
 * toggle their own state, and renders up to 4 avatars + a "+N" overflow
 * chip. Stays defensive: failures just disable the button instead of
 * crashing the sidebar.
 */

import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { apiGet, apiPost, apiDelete, resolveServerUrl } from '../../../../api/client.js';
import { Avatar } from '../../../ui';

const VISIBLE_AVATARS = 4;

export default function WatcherControl({ taskId }) {
  const [snapshot, setSnapshot] = useState({
    taskId,
    state: 'loading', // 'loading' | 'ready' | 'error'
    watchers: [],
    watching: false,
  });
  const [busy, setBusy] = useState(false);

  // Re-derive when the task changes — same render-time pattern we use in
  // QuickStartCard so we never call setState in an effect.
  if (snapshot.taskId !== taskId) {
    setSnapshot({ taskId, state: 'loading', watchers: [], watching: false });
  }

  useEffect(() => {
    let cancelled = false;
    apiGet(`/tasks/${taskId}/watchers`)
      .then((data) => {
        if (cancelled) return;
        setSnapshot({
          taskId,
          state: 'ready',
          watchers: (data?.watchers || []).map((w) => ({
            ...w,
            avatar: resolveServerUrl(w.avatar),
          })),
          watching: !!data?.watching,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setSnapshot({ taskId, state: 'error', watchers: [], watching: false });
      });
    return () => { cancelled = true; };
  }, [taskId]);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const data = snapshot.watching
        ? await apiDelete(`/tasks/${taskId}/watchers`)
        : await apiPost(`/tasks/${taskId}/watchers`, {});
      setSnapshot({
        taskId,
        state: 'ready',
        watchers: (data?.watchers || []).map((w) => ({
          ...w,
          avatar: resolveServerUrl(w.avatar),
        })),
        watching: !!data?.watching,
      });
    } catch {
      // Leave the previous state in place; the caller can retry.
    } finally {
      setBusy(false);
    }
  };

  const { watchers, watching, state } = snapshot;
  const visible = watchers.slice(0, VISIBLE_AVATARS);
  const overflow = Math.max(0, watchers.length - VISIBLE_AVATARS);
  const Icon = watching ? EyeOff : Eye;
  const label = watching ? 'Watching' : 'Watch';

  return (
    <div className="task-detail-watch-row">
      <button
        type="button"
        className={`task-detail-watch-btn ${watching ? 'is-watching' : ''}`}
        onClick={toggle}
        disabled={busy || state === 'loading' || state === 'error'}
        title={
          state === 'error'
            ? 'Couldn\u2019t load watchers'
            : watching
              ? 'Stop watching this task'
              : 'Get notified about activity on this task'
        }
        aria-pressed={watching}
      >
        <Icon size={13} /> {label}
        {watchers.length > 0 && (
          <span className="task-detail-watch-count">{watchers.length}</span>
        )}
      </button>

      {watchers.length > 0 && (
        <div className="task-detail-watch-pile" aria-label={`${watchers.length} watcher${watchers.length === 1 ? '' : 's'}`}>
          {visible.map((w) => (
            <Avatar
              key={w.id}
              src={w.avatar}
              name={w.name || w.email}
              alt={w.name || w.email}
              title={w.name || w.email}
              className="task-detail-watch-avatar"
            />
          ))}
          {overflow > 0 && (
            <span className="task-detail-watch-avatar task-detail-watch-overflow" title={`${overflow} more`}>
              +{overflow}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
