/**
 * Persistence + tiny pub-sub for the QuickStart card. Lives in its own
 * module so the JSX file only exports the component (Fast Refresh
 * requirement), and so consumers like `useBoard` can record progress
 * without importing the component.
 */

const STORAGE_PREFIX = 'Elevate-quickstart-';

const DEFAULT_STATE = { dismissed: false, didDrag: false, collapsed: false };

// Subscribers: workspaceId -> Set<listener>. Lightweight pub-sub so a
// state write triggers any mounted card to re-read storage immediately,
// instead of waiting for the next render that reads it accidentally.
const listeners = new Map();

function notify(workspaceId, state) {
  const set = listeners.get(workspaceId);
  if (!set) return;
  for (const fn of set) {
    try { fn(state); } catch { /* listener errors shouldn't break callers */ }
  }
}

export function loadQuickStartState(workspaceId) {
  if (!workspaceId) return { ...DEFAULT_STATE };
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + workspaceId);
    return raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : { ...DEFAULT_STATE };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveQuickStartState(workspaceId, state) {
  if (!workspaceId) return;
  try {
    localStorage.setItem(STORAGE_PREFIX + workspaceId, JSON.stringify(state));
  } catch {
    // Storage failures are not actionable.
  }
  notify(workspaceId, state);
}

export function subscribeQuickStart(workspaceId, fn) {
  if (!workspaceId) return () => {};
  if (!listeners.has(workspaceId)) listeners.set(workspaceId, new Set());
  listeners.get(workspaceId).add(fn);
  return () => {
    const set = listeners.get(workspaceId);
    if (!set) return;
    set.delete(fn);
    if (set.size === 0) listeners.delete(workspaceId);
  };
}

/** Idempotent: marks the "drag a card" step complete for this workspace. */
export function recordQuickStartDrag(workspaceId) {
  if (!workspaceId) return;
  const current = loadQuickStartState(workspaceId);
  if (current.didDrag) return; // already done — skip the storage write
  saveQuickStartState(workspaceId, { ...current, didDrag: true });
}
