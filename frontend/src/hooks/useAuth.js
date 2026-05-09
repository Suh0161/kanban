import { useState, useCallback } from 'react';

const DEMO_USER = {
  email: 'demo@demo.com',
  name: 'Demo User',
  avatar: 'https://api.dicebear.com/7.x/notionists-neutral/png?seed=DemoUser',
};

const STORAGE_KEY = 'jokel-auth';

function getStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [user, setUser] = useState(getStoredUser);

  const login = useCallback((email, password) => {
    if (email === 'demo@demo.com' && password === 'Demo123') {
      setUser(DEMO_USER);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_USER));
      return { success: true };
    }
    return { success: false, error: 'Invalid email or password' };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { user, isLoggedIn: !!user, login, logout };
}
