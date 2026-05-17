/**
 * Fetches the list of OAuth providers the backend has configured.
 *
 * The login page uses this so we never render a button that won't work —
 * if the env vars aren't set, the provider isn't returned, and we hide
 * its button entirely.
 */

import { useEffect, useState } from 'react';
import { apiGet } from '../api/client.js';

const KNOWN_PROVIDERS = {
  google: { id: 'google', name: 'Google' },
  github: { id: 'github', name: 'GitHub' },
};

export function useOauthProviders() {
  const [state, setState] = useState({ status: 'loading', providers: [] });

  useEffect(() => {
    let cancelled = false;
    apiGet('/auth/oauth/providers')
      .then((data) => {
        if (cancelled) return;
        const list = (data?.providers || [])
          .map((p) => KNOWN_PROVIDERS[p.id] || { id: p.id, name: p.name })
          .filter(Boolean);
        setState({ status: 'ready', providers: list });
      })
      .catch(() => {
        if (cancelled) return;
        // Not having any configured is fine — buttons just won't render.
        setState({ status: 'ready', providers: [] });
      });
    return () => { cancelled = true; };
  }, []);

  return state;
}
