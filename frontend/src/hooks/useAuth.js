import { useState, useCallback, useEffect } from 'react';
import {
  apiFetch,
  apiUpload,
  resolveServerUrl,
  setSessionClearHandler,
  clearAuthSession,
  setAuthTokens,
  restoreSessionFromRefresh,
  logoutSession,
  getAccessToken,
  hydrateAccessTokenFromSessionStorage,
  migrateLegacyAccessToken,
} from '../api/client.js';
import { ALLOWED_IMAGE_LABEL, isAllowedImageFile } from '../utils/fileTypes.js';

const STORAGE_KEY = 'Elevate-auth';

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

// Initialize from storage (display name/avatar while refresh runs).
sharedUser = normalizeUser(getStoredUser());

/** Sync shared auth state after OAuth or other out-of-band token writes. */
export function applyAuthSession(user, { token, csrfToken } = {}) {
  if (token || csrfToken) {
    setAuthTokens({ token, csrfToken });
  } else if (!user) {
    clearAuthSession();
  }
  setSharedUser(user ?? null);
}

setSessionClearHandler(() => setSharedUser(null));

export function useAuth() {
  const [user, setUser] = useState(() => sharedUser ?? getStoredUser());
  const [loading, setLoading] = useState(true);

  // Subscribe to shared user updates
  useEffect(() => {
    const listener = (u) => setUser(u);
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);

  // On mount, restore session via refresh cookie (fallback: cached access token).
  useEffect(() => {
    let cancelled = false;

    (async () => {
      migrateLegacyAccessToken();
      hydrateAccessTokenFromSessionStorage();

      try {
        const data = await restoreSessionFromRefresh();
        if (cancelled) return;
        if (data?.user) {
          setSharedUser(data.user);
          return;
        }
        if (data?.token) {
          const me = await apiFetch('/auth/me');
          if (!cancelled) setSharedUser(me.user);
          return;
        }
      } catch {
        // Refresh may 403 without a readable CSRF token cross-origin — fall back.
      }

      if (cancelled) return;

      if (getAccessToken()) {
        try {
          const me = await apiFetch('/auth/me');
          if (!cancelled) setSharedUser(me.user);
          return;
        } catch {
          if (!cancelled) clearAuthSession();
          return;
        }
      }

      if (!cancelled) {
        setSharedUser(null);
      }
    })().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setSharedUser(data.user);
      setAuthTokens({ token: data.token, csrfToken: data.csrfToken });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  const logout = useCallback(async () => {
    await logoutSession();
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
   */
  const uploadAvatar = useCallback(async (file) => {
    if (!file) throw new Error('No file selected');
    if (file.size > 2 * 1024 * 1024) throw new Error('Image must be under 2MB');
    if (!isAllowedImageFile(file)) throw new Error(`File must be ${ALLOWED_IMAGE_LABEL}`);

    const fd = new FormData();
    fd.append('file', file);
    const { url } = await apiUpload('/auth/avatar', fd);

    const me = await apiFetch('/auth/me');
    setSharedUser(me.user);
    return url;
  }, []);

  return { user, isLoggedIn: !!user, loading, login, logout, updateProfile, uploadAvatar };
}
