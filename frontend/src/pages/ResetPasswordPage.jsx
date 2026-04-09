import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { api } from '../lib/api';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [done, setDone] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setOk('');
    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Falta configurar Supabase en frontend (.env.local)');
      }
      const { error: supaError } = await supabase.auth.updateUser({ password });
      if (supaError) throw new Error(supaError.message);
      await api('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ source: 'recovery' }) }).catch(() => null);
      setOk('Contrasena restablecida. Ya puedes iniciar sesion.');
      setDone(true);
    } catch (err) {
      setError(err.message || 'No se pudo restablecer la contrasena');
    } finally {
      setLoading(false);
    }
  };

  if (done) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-surface grid place-items-center p-6">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-surface p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-headline font-extrabold text-primary-container">Restablecer Contrasena</h1>
          <p className="text-sm text-on-surface-variant mt-1">Ingresa tu nueva clave segura.</p>
        </div>
        {error && <div className="p-3 rounded-md bg-error-container text-on-error-container text-sm">{error}</div>}
        {ok && <div className="p-3 rounded-md bg-[#e6f4ea] text-[#1e8e3e] text-sm">{ok}</div>}
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm"
            placeholder="Nueva contrasena"
          />
          <button type="submit" disabled={loading} className="w-full text-white text-sm font-semibold py-2.5 rounded-md disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #000a1e, #002147)' }}>
            {loading ? 'Guardando...' : 'Guardar nueva contrasena'}
          </button>
        </form>
        <Link to="/login" className="text-sm text-secondary hover:underline">Volver al login</Link>
      </div>
    </div>
  );
}
