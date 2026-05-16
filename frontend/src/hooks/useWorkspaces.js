import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '../api/client.js';

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/workspaces')
      .then((data) => setWorkspaces(data))
      .catch(() => setWorkspaces([]))
      .finally(() => setLoading(false));
  }, []);

  const addWorkspace = useCallback(async (name) => {
    const ws = await apiPost('/workspaces', { name });
    setWorkspaces((prev) => [...prev, ws]);
    return ws;
  }, []);

  const updateWorkspace = useCallback(async (id, updates) => {
    const ws = await apiPatch(`/workspaces/${id}`, updates);
    setWorkspaces((prev) => prev.map((w) => (w.id === id ? ws : w)));
  }, []);

  const deleteWorkspace = useCallback(async (id) => {
    await apiDelete(`/workspaces/${id}`);
    setWorkspaces((prev) => prev.filter((w) => w.id !== id));
  }, []);

  return { workspaces, loading, addWorkspace, updateWorkspace, deleteWorkspace };
}
