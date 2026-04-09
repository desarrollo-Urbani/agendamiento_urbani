import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api('/api/auth/me');
        if (mounted) setUser(res.user || null);
      } catch (_) {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    async login(email, password) {
      const res = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      setUser(res.user);
      return res;
    },
    async logout() {
      await api('/api/auth/logout', { method: 'POST' });
      setUser(null);
    },
    async refresh() {
      const res = await api('/api/auth/me');
      setUser(res.user || null);
      return res.user || null;
    }
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
