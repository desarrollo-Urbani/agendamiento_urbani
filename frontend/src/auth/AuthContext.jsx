import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refreshProfile() {
    try {
      const res = await api('/api/auth/me');
      setUser(res.user || null);
      return res.user || null;
    } catch (_) {
      setUser(null);
      return null;
    }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      await refreshProfile();
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    async login(email) {
      const res = await api('/api/auth/login-email', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      setUser(res.user || null);
      return res;
    },
    async logout() {
      await api('/api/auth/logout', { method: 'POST' });
      setUser(null);
    },
    async refresh() {
      return refreshProfile();
    }
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
