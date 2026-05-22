import { useState, useCallback, useEffect } from 'react';
import {
  apiFetch, apiUpload, resolveServerUrl, setSessionClearHandler, clearAuthSession,
} from '../api/client.js';
import { ALLOWED_IMAGE_LABEL, isAllowedImageFile } from '../utils/fileTypes.js';

const STORAGE_KEY = 'Elevate-auth';
const TOKEN_KEY = 'Elevate-token';

// Shared listeners so all useAuth() instances stay in sync
const listeners = new Set();
let sharedUser = null;

/** Normalize the user object so consumers always see absolute URLs. */
function normalizeUser(u) {
  if (!u) return u;
  return { ...u, avatar: resolveServerUrl(u.avatar) };
}

function getStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setSharedUser(user) {
  sharedUser = normalizeUser(user);
  if (sharedUser) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sharedUser));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
  listeners.forEach(fn => fn(sharedUser));
}

// Initialize from storage
sharedUser = normalizeUser(getStoredUser());

/** Sync shared auth state after OAuth or other out-of-band token writes. */
export function applyAuthSession(user, { token } = {}) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else if (!user) {
    localStorage.removeItem(TOKEN_KEY);
  }
  setSharedUser(user ?? null);
}

setSessionClearHandler(() => setSharedUser(null));

export function useAuth() {
  const [user, setUser] = useState(() => sharedUser ?? getStoredUser());
  const [loading, setLoading] = useState(() => {
    // If no token, not loading
    return !!localStorage.getItem(TOKEN_KEY);
  });

  // Subscribe to shared user updates
  useEffect(() => {
    const listener = (u) => setUser(u);
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);

  // On mount, validate token
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      // Use a microtask to avoid setState-in-effect warning
      Promise.resolve().then(() => setLoading(false));
      return;
    }
    apiFetch('/auth/me')
      .then((data) => {
        setSharedUser(data.user);
      })
      .catch(() => {
        clearAuthSession();
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setSharedUser(data.user);
      localStorage.setItem(TOKEN_KEY, data.token);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  const logout = useCallback(() => {
    clearAuthSession();
  }, []);

  const updateProfile = useCallback(async (updates) => {
    const data = await apiFetch('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    setSharedUser(data.user);
    return data.user;
  }, []);

  /**
   * Upload an avatar via multipart and refresh the cached user with the
   * new URL the server returned. Returns the new avatar URL.
   *
   * Avatars are stored in object storage (small URL pointer in the DB),
   * not as base64 — keeps the users row tiny and lets the browser cache
   * the image. See backend `services/avatarService.js`.
   */
  const uploadAvatar = useCallback(async (file) => {
    if (!file) throw new Error('No file selected');
    if (file.size > 2 * 1024 * 1024) throw new Error('Image must be under 2MB');
    if (!isAllowedImageFile(file)) throw new Error(`File must be ${ALLOWED_IMAGE_LABEL}`);

    const fd = new FormData();
    fd.append('file', file);
    const { url } = await apiUpload('/auth/avatar', fd);

    // Refresh /auth/me so the cached user has the new avatar URL.
    const me = await apiFetch('/auth/me');
    setSharedUser(me.user);
    return url;
  }, []);

  return { user, isLoggedIn: !!user, loading, login, logout, updateProfile, uploadAvatar };
}
