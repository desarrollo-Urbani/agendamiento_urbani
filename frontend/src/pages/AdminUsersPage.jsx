import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api } from '../lib/api';

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [workingId, setWorkingId] = useState(null);

  const isAdmin = user?.role === 'admin';

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api('/api/admin/users');
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || 'No se pudo cargar usuarios');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const adminsCount = useMemo(() => rows.filter((r) => r.role === 'admin').length, [rows]);

  async function setRole(target, role) {
    setWorkingId(target.id);
    setError('');
    try {
      await api(`/api/admin/users/${target.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role })
      });
      await load();
    } catch (e) {
      setError(e.message || 'No se pudo actualizar el rol');
    } finally {
      setWorkingId(null);
    }
  }

  if (!isAdmin) {
    return (
      <section className="space-y-3">
        <h1 className="text-4xl font-headline font-black text-primary">Administradores</h1>
        <p className="text-sm text-on-surface-variant">No tienes permisos para ver esta seccion.</p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-4xl font-headline font-black text-primary">Administradores</h1>
          <p className="text-sm text-on-surface-variant">Gestiona quienes pueden administrar el sistema.</p>
        </div>
        <div className="px-4 py-2 rounded-xl bg-white shadow-sm border border-slate-200 text-sm">
          Admins activos: <strong>{adminsCount}</strong>
        </div>
      </header>

      {error ? (
        <div className="px-4 py-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-100">{error}</div>
      ) : null}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left p-3 font-semibold">Usuario</th>
              <th className="text-left p-3 font-semibold">Email</th>
              <th className="text-left p-3 font-semibold">Rol</th>
              <th className="text-left p-3 font-semibold">Estado</th>
              <th className="text-left p-3 font-semibold">Accion</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-4 text-on-surface-variant" colSpan={5}>Cargando usuarios...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="p-4 text-on-surface-variant" colSpan={5}>No hay usuarios.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="p-3">{r.displayName || '-'}</td>
                <td className="p-3">{r.email}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${r.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                    {r.role === 'admin' ? 'Administrador' : 'Ejecutivo'}
                  </span>
                  {r.isProtectedAdmin ? <span className="ml-2 text-xs text-amber-700">protegido</span> : null}
                </td>
                <td className="p-3">{r.isActive ? 'Activo' : 'Inactivo'}</td>
                <td className="p-3">
                  {r.role === 'admin' ? (
                    <button
                      className="px-3 py-1.5 rounded-md text-xs font-semibold border border-red-200 text-red-700 disabled:opacity-60"
                      disabled={workingId === r.id || r.isProtectedAdmin}
                      onClick={() => setRole(r, 'executive')}
                    >
                      Quitar admin
                    </button>
                  ) : (
                    <button
                      className="px-3 py-1.5 rounded-md text-xs font-semibold border border-blue-200 text-blue-700 disabled:opacity-60"
                      disabled={workingId === r.id}
                      onClick={() => setRole(r, 'admin')}
                    >
                      Hacer admin
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

