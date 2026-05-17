import { useState, useEffect, useRef } from 'react';
import { apiPost, apiGet } from '../api/client.js';

const HEARTBEAT_INTERVAL = 45000;

export default function usePresence(workspaceId) {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    async function fetchPresence() {
      if (!workspaceId) return;
      try {
        const data = await apiGet(`/workspaces/${workspaceId}/presence`);
        if (mountedRef.current) {
          setOnlineUsers(data.online || []);
          setError(null);
        }
      } catch {
        if (mountedRef.current) {
          setOnlineUsers([]);
        }
      }
    }

    async function sendHeartbeat() {
      if (!workspaceId) return;
      try {
        await apiPost(`/workspaces/${workspaceId}/presence/heartbeat`);
      } catch {
        // Silent fail — presence is non-critical
      }
    }

    if (workspaceId) {
      fetchPresence();
      sendHeartbeat();

      intervalRef.current = setInterval(() => {
        sendHeartbeat();
        fetchPresence();
      }, HEARTBEAT_INTERVAL);
    }

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [workspaceId]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { onlineUsers, error };
}
