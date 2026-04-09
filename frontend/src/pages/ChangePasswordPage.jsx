import { useState } from 'react';
import { api } from '../lib/api';

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setOk('');
    try {
      await api('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      setCurrentPassword('');
      setNewPassword('');
      setOk('Contrasena actualizada. Vuelve a iniciar sesion.');
    } catch (err) {
      setError(err.message || 'No se pudo cambiar la contrasena');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <header>
        <h2 className="text-3xl font-headline font-extrabold text-primary-container tracking-tight">Cambiar Contrasena</h2>
        <p className="text-sm text-on-surface-variant mt-1">Actualiza tu acceso de forma segura.</p>
      </header>

      {error && <div className="p-3 rounded-md bg-error-container text-on-error-container text-sm">{error}</div>}
      {ok && <div className="p-3 rounded-md bg-[#e6f4ea] text-[#1e8e3e] text-sm">{ok}</div>}

      <form onSubmit={onSubmit} className="bg-surface-container-lowest rounded-xl shadow-surface p-5 space-y-4">
        <div>
          <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Contrasena actual</label>
          <input type="password" required value={currentPassword} onChange={(e)=>setCurrentPassword(e.target.value)} className="w-full bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Nueva contrasena</label>
          <input type="password" required minLength={8} value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} className="w-full bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm" />
        </div>
        <button type="submit" disabled={loading} className="text-white text-sm font-semibold px-4 py-2 rounded-md disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #000a1e, #002147)' }}>
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
      </form>
    </div>
  );
}
