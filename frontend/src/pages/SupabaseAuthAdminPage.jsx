import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api } from '../lib/api';

export default function SupabaseAuthAdminPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState('executive');
  const [creating, setCreating] = useState(false);

  const [passwordById, setPasswordById] = useState({});
  const [workingId, setWorkingId] = useState('');

  const isAdmin = user?.role === 'admin';

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api('/api/admin/supabase-users');
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || 'No se pudo cargar usuarios de Supabase');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const stats = useMemo(() => ({
    total: rows.length,
    confirmed: rows.filter((r) => r.emailConfirmedAt).length,
    active: rows.filter((r) => !r.bannedUntil).length
  }), [rows]);

  const onCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    setOk('');
    try {
      await api('/api/admin/supabase-users', {
        method: 'POST',
        body: JSON.stringify({
          email: newEmail.trim().toLowerCase(),
          password: newPassword,
          displayName: newDisplayName.trim(),
          role: newRole
        })
      });
      setOk('Usuario creado correctamente en Supabase Auth.');
      setNewEmail('');
      setNewPassword('');
      setNewDisplayName('');
      setNewRole('executive');
      await load();
    } catch (e) {
      setError(e.message || 'No se pudo crear usuario');
    } finally {
      setCreating(false);
    }
  };

  const onDelete = async (row) => {
    const email = String(row.email || '').toLowerCase();
    if (!email) return;
    if (!window.confirm(`Eliminar usuario ${email} de Supabase Auth?`)) return;
    setWorkingId(row.id);
    setError('');
    setOk('');
    try {
      await api(`/api/admin/supabase-users/${encodeURIComponent(row.id)}`, { method: 'DELETE' });
      setOk(`Usuario ${email} eliminado.`);
      await load();
    } catch (e) {
      setError(e.message || 'No se pudo eliminar usuario');
    } finally {
      setWorkingId('');
    }
  };

  const onUpdatePassword = async (row) => {
    const next = passwordById[row.id] || '';
    if (next.length < 8) {
      setError('La nueva contrasena debe tener al menos 8 caracteres.');
      return;
    }
    setWorkingId(row.id);
    setError('');
    setOk('');
    try {
      await api(`/api/admin/supabase-users/${encodeURIComponent(row.id)}/password`, {
        method: 'POST',
        body: JSON.stringify({ password: next })
      });
      setOk(`Contrasena actualizada para ${row.email}.`);
      setPasswordById((prev) => ({ ...prev, [row.id]: '' }));
    } catch (e) {
      setError(e.message || 'No se pudo actualizar contrasena');
    } finally {
      setWorkingId('');
    }
  };

  if (!isAdmin) {
    return (
      <section className="space-y-3">
        <h1 className="text-4xl font-headline font-black text-primary">Auth Supabase</h1>
        <p className="text-sm text-on-surface-variant">No tienes permisos para ver esta seccion.</p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-4xl font-headline font-black text-primary">Auth Supabase</h1>
          <p className="text-sm text-on-surface-variant">Gestion de usuarios y contrasenas directamente en Supabase Authentication.</p>
        </div>
        <button
          onClick={load}
          className="px-4 py-2 rounded-md border border-slate-200 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low"
        >
          Actualizar
        </button>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <article className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Usuarios</p>
          <p className="text-2xl font-headline font-extrabold text-primary-container">{stats.total}</p>
        </article>
        <article className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Confirmados</p>
          <p className="text-2xl font-headline font-extrabold text-secondary">{stats.confirmed}</p>
        </article>
        <article className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Activos</p>
          <p className="text-2xl font-headline font-extrabold text-[#1e8e3e]">{stats.active}</p>
        </article>
      </section>

      {error ? <div className="px-4 py-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-100">{error}</div> : null}
      {ok ? <div className="px-4 py-3 rounded-lg text-sm bg-[#e6f4ea] text-[#1e8e3e] border border-[#c7e7cf]">{ok}</div> : null}

      <form onSubmit={onCreate} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <input
          type="email"
          required
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="email@dominio.com"
          className="bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm"
        />
        <input
          type="password"
          required
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Contrasena temporal"
          className="bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm"
        />
        <input
          type="text"
          value={newDisplayName}
          onChange={(e) => setNewDisplayName(e.target.value)}
          placeholder="Nombre para mostrar"
          className="bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm"
        />
        <select
          value={newRole}
          onChange={(e) => setNewRole(e.target.value)}
          className="bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm"
        >
          <option value="usuario">usuario</option>
          <option value="lector">lector</option>
          <option value="admin">admin</option>
        </select>
        <button
          type="submit"
          disabled={creating}
          className="text-white text-sm font-semibold py-2.5 rounded-md disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #000a1e, #002147)' }}
        >
          {creating ? 'Creando...' : 'Agregar Usuario'}
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left p-3 font-semibold">Email</th>
              <th className="text-left p-3 font-semibold">Display Name</th>
              <th className="text-left p-3 font-semibold">Rol</th>
              <th className="text-left p-3 font-semibold">Confirmado</th>
              <th className="text-left p-3 font-semibold">Ultimo acceso</th>
              <th className="text-left p-3 font-semibold">Nueva contrasena</th>
              <th className="text-left p-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-4 text-on-surface-variant" colSpan={7}>Cargando usuarios...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="p-4 text-on-surface-variant" colSpan={7}>No hay usuarios en Supabase Auth.</td></tr>
            ) : rows.map((r) => {
              const self = String(r.email || '').toLowerCase() === String(user?.email || '').toLowerCase();
              return (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="p-3 font-medium">{r.email || '-'}</td>
                  <td className="p-3">{r.displayName || '-'}</td>
                  <td className="p-3">{r.role || 'executive'}</td>
                  <td className="p-3">{r.emailConfirmedAt ? 'Si' : 'No'}</td>
                  <td className="p-3">{r.lastSignInAt ? String(r.lastSignInAt).replace('T', ' ').slice(0, 16) : '-'}</td>
                  <td className="p-3">
                    <input
                      type="password"
                      minLength={8}
                      value={passwordById[r.id] || ''}
                      onChange={(e) => setPasswordById((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      placeholder="Nueva contrasena"
                      className="w-full bg-surface-container-low border-none rounded-md px-3 py-2 text-xs"
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={workingId === r.id}
                        onClick={() => onUpdatePassword(r)}
                        className="px-2.5 py-1.5 rounded-md text-xs font-semibold border border-blue-200 text-blue-700 disabled:opacity-60"
                      >
                        Cambiar clave
                      </button>
                      <button
                        type="button"
                        disabled={workingId === r.id || self}
                        onClick={() => onDelete(r)}
                        className="px-2.5 py-1.5 rounded-md text-xs font-semibold border border-red-200 text-red-700 disabled:opacity-60"
                        title={self ? 'No puedes eliminarte a ti mismo' : 'Eliminar usuario'}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
