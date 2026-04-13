import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { api, setAuthToken } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const syncingRef = useRef(false);

  /** Sincroniza el JWT de Supabase con el backend y retorna el perfil del usuario */
  async function syncWithBackend(accessToken) {
    if (!accessToken) return null;
    try {
      setAuthToken(accessToken);
      const res = await api('/api/auth/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      return res.user || null;
    } catch (_) {
      return null;
    }
  }

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    // Sesión inicial al cargar la app
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setAuthToken(session.access_token);
        const u = await syncWithBackend(session.access_token);
        setUser(u);
      }
      setLoading(false);
    });

    // Escuchar cambios de sesión (login, logout, refresh, recovery)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session && !syncingRef.current) {
            syncingRef.current = true;
            setAuthToken(session.access_token);
            const u = await syncWithBackend(session.access_token);
            setUser(u);
            syncingRef.current = false;
          }
        } else if (event === 'SIGNED_OUT') {
          setAuthToken(null);
          setUser(null);
        }
        // PASSWORD_RECOVERY: Supabase establece sesión temporal, ResetPasswordPage la usa directamente
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo(() => ({
    user,
    loading,

    /** Login con Supabase Auth (email + contraseña) */
    async login(email, password) {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase no está configurado. Revisa VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en frontend/.env.local');
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      setAuthToken(data.session.access_token);
      const u = await syncWithBackend(data.session.access_token);
      if (!u) {
        await supabase.auth.signOut();
        setAuthToken(null);
        throw new Error('Tu usuario no está autorizado en el sistema. Contacta al administrador.');
      }
      setUser(u);
      return { user: u };
    },

    /** Envía email de recuperación de contraseña vía Supabase */
    async resetPasswordForEmail(email) {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase no configurado');
      }
      const redirectTo = `${window.location.origin}/restablecer-contrasena`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw new Error(error.message);
    },

    async logout() {
      try { await api('/api/auth/logout', { method: 'POST' }); } catch (_) {}
      if (supabase) await supabase.auth.signOut();
      setAuthToken(null);
      setUser(null);
    },

    async refresh() {
      if (!supabase) return null;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setUser(null); return null; }
      setAuthToken(session.access_token);
      const u = await syncWithBackend(session.access_token);
      setUser(u);
      return u;
    }
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
