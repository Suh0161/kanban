import { useEffect, useState, useCallback } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '../api/client.js';

/**
 * Single state object so a refetch only triggers one render and we can
 * keep the synchronous reset (`loading: true, error: null`) out of the
 * effect body — that pattern trips the new react-hooks/set-state-in-effect
 * lint rule, but reading from state during render is fine.
 *
 * Shape: { key, status, workspaces, error }
 *   key      — strictly increasing token; bumping it triggers a refetch
 *   status   — 'idle' | 'loading' | 'ready' | 'error'
 *   workspaces — last successful list
 *   error    — last failed ApiError
 */
const initial = { key: 0, status: 'loading', workspaces: [], error: null };

export function useWorkspaces() {
  const [state, setState] = useState(initial);

  useEffect(() => {
    let cancelled = false;
    apiGet('/workspaces')
      .then((data) => {
        if (cancelled) return;
        setState((prev) => ({ ...prev, status: 'ready', workspaces: data || [], error: null }));
      })
      .catch((err) => {
        if (cancelled) return;
        setState((prev) => ({ ...prev, status: 'error', workspaces: [], error: err }));
      });
    return () => { cancelled = true; };
  }, [state.key]);

  const refetch = useCallback(() => {
    setState((prev) => ({ ...prev, key: prev.key + 1, status: 'loading', error: null }));
  }, []);

  const addWorkspace = useCallback(async (name) => {
    const ws = await apiPost('/workspaces', { name });
    setState((prev) => ({ ...prev, workspaces: [...prev.workspaces, ws] }));
    return ws;
  }, []);

  const updateWorkspace = useCallback(async (id, updates) => {
    const ws = await apiPatch(`/workspaces/${id}`, updates);
    setState((prev) => ({
      ...prev,
      workspaces: prev.workspaces.map((w) => (w.id === id ? ws : w)),
    }));
  }, []);

  const deleteWorkspace = useCallback(async (id) => {
    await apiDelete(`/workspaces/${id}`);
    setState((prev) => ({
      ...prev,
      workspaces: prev.workspaces.filter((w) => w.id !== id),
    }));
  }, []);

  return {
    workspaces: state.workspaces,
    loading: state.status === 'loading',
    error: state.status === 'error' ? state.error : null,
    refetch,
    addWorkspace,
    updateWorkspace,
    deleteWorkspace,
  };
}

/**
 * Role hierarchy used across the UI for permission gating.
 *
 * Server is the source of truth — these helpers exist so we can hide
 * controls a user wouldn't be allowed to use, but the API still enforces
 * permissions on every mutation.
 */
const ROLE_RANK = { viewer: 0, member: 1, admin: 2, owner: 3 };

export function hasRole(role, atLeast) {
  return (ROLE_RANK[role] ?? -1) >= (ROLE_RANK[atLeast] ?? 99);
}

export const can = {
  read: (role) => hasRole(role, 'viewer'),
  edit: (role) => hasRole(role, 'member'),
  manage: (role) => hasRole(role, 'admin'),
  delete: (role) => hasRole(role, 'owner'),
};
