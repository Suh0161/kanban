/** Persist which activity-log rows were dismissed as "read" (local-only, per device). */

const STORAGE_KEY = 'Elevate-notification-read-v1';
const MAX_IDS_PER_USER = 420;

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* quota / privacy mode */
  }
}

/** @returns {ReadonlySet<string>} */
export function getReadIds(userId) {
  if (!userId) return new Set();
  const store = readStore();
  const list = Array.isArray(store[userId]) ? store[userId] : [];
  return new Set(list);
}

function normalizeList(list, extras) {
  const next = [...extras, ...(Array.isArray(list) ? list : [])];
  const seen = new Set();
  const out = [];
  for (const id of next) {
    if (typeof id !== 'string' || !id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= MAX_IDS_PER_USER) break;
  }
  return out;
}

export function markNotificationRead(userId, activityId) {
  if (!userId || !activityId) return;
  const store = readStore();
  const prev = Array.isArray(store[userId]) ? store[userId] : [];
  store[userId] = normalizeList(prev, [activityId]);
  writeStore(store);
}

export function markNotificationsReadAll(userId, activityIds) {
  if (!userId || !activityIds?.length) return;
  const store = readStore();
  const prev = Array.isArray(store[userId]) ? store[userId] : [];
  store[userId] = normalizeList(prev, [...activityIds].reverse());
  writeStore(store);
}
