import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_WORKSPACES = [
  { id: 'trust-and-safety', name: 'Trust & Safety', members: 4 }
];

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState(() => {
    const saved = localStorage.getItem('jokel-workspaces');
    if (saved) return JSON.parse(saved);
    localStorage.setItem('jokel-workspaces', JSON.stringify(DEFAULT_WORKSPACES));
    return DEFAULT_WORKSPACES;
  });

  useEffect(() => {
    localStorage.setItem('jokel-workspaces', JSON.stringify(workspaces));
  }, [workspaces]);

  const addWorkspace = (name) => {
    const newWorkspace = {
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + uuidv4().slice(0, 4),
      name,
      members: 1
    };
    setWorkspaces(prev => [...prev, newWorkspace]);
    return newWorkspace;
  };

  const deleteWorkspace = (id) => {
    setWorkspaces(prev => prev.filter(w => w.id !== id));
    localStorage.removeItem(`jokel-board-${id}`);
  };

  return { workspaces, addWorkspace, deleteWorkspace };
}
