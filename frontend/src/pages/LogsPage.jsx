import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

export default function LogsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    module: '',
    action: '',
    status: '',
    from: '',
    to: ''
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(filters).filter(([, value]) => value))
      );
      const data = await api(`/api/logs?${qs.toString()}`);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || 'No se pudo cargar logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      load();
    }, 15000);
    return () => clearInterval(timer);
  }, [filters]);

  const stats = useMemo(() => {
    const views = rows.filter((r) => String(r.action || '').startsWith('view_')).length;
    const modifications = rows.filter((r) => ['create_visit', 'update_visit', 'delete_visit', 'block_slot', 'book_slot', 'release_slot'].includes(String(r.action))).length;
    return { views, modifications };
  }, [rows]);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-3xl font-headline font-extrabold text-primary-container tracking-tight">Registro de Logs</h2>
        <p className="text-sm text-on-surface-variant">Trazabilidad de vistas y modificaciones de reservas/estados.</p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <article className="bg-surface-container-lowest rounded-xl p-4 shadow-surface">
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Eventos</p>
          <p className="text-2xl font-headline font-extrabold text-primary-container">{rows.length}</p>
        </article>
        <article className="bg-surface-container-lowest rounded-xl p-4 shadow-surface">
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Vistas</p>
          <p className="text-2xl font-headline font-extrabold text-secondary">{stats.views}</p>
        </article>
        <article className="bg-surface-container-lowest rounded-xl p-4 shadow-surface">
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Modificaciones</p>
          <p className="text-2xl font-headline font-extrabold text-[#8d6e00]">{stats.modifications}</p>
        </article>
      </section>

      <section className="bg-surface-container-lowest rounded-xl shadow-surface p-4 grid grid-cols-1 md:grid-cols-6 gap-3">
        <input placeholder="Modulo" value={filters.module} onChange={(e) => setFilters((f) => ({ ...f, module: e.target.value }))} className="bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm" />
        <input placeholder="Accion" value={filters.action} onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))} className="bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm" />
        <input placeholder="Estado" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} className="bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm" />
        <input type="datetime-local" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} className="bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm" />
        <input type="datetime-local" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} className="bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm" />
        <button onClick={load} className="text-white text-sm font-semibold px-4 py-2 rounded-md" style={{ background: 'linear-gradient(135deg, #000a1e, #002147)' }}>
          Filtrar
        </button>
      </section>

      <div className="flex justify-end">
        <button
          onClick={load}
          className="text-xs font-semibold px-3 py-1.5 rounded-md border border-slate-200 text-on-surface-variant hover:bg-surface-container-low"
        >
          Actualizar ahora
        </button>
      </div>

      {error && <div className="p-3 rounded-md bg-error-container text-on-error-container text-sm">{error}</div>}

      <section className="bg-surface-container-lowest rounded-xl shadow-surface overflow-hidden">
        <div className="px-5 py-4 bg-surface-container-low flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Bitacora</span>
          <span className="text-xs text-on-surface-variant">{loading ? 'Cargando...' : `${rows.length} eventos`}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead>
              <tr className="bg-surface-container-low/40">
                <th className="px-5 py-3 text-[10px] uppercase tracking-widest text-on-surface-variant">Fecha</th>
                <th className="px-5 py-3 text-[10px] uppercase tracking-widest text-on-surface-variant">Usuario</th>
                <th className="px-5 py-3 text-[10px] uppercase tracking-widest text-on-surface-variant">Accion</th>
                <th className="px-5 py-3 text-[10px] uppercase tracking-widest text-on-surface-variant">Modulo</th>
                <th className="px-5 py-3 text-[10px] uppercase tracking-widest text-on-surface-variant">Entidad</th>
                <th className="px-5 py-3 text-[10px] uppercase tracking-widest text-on-surface-variant">Detalle</th>
                <th className="px-5 py-3 text-[10px] uppercase tracking-widest text-on-surface-variant">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8f9ff' }}>
                  <td className="px-5 py-3 text-sm text-on-surface-variant">{String(r.created_at).replace('T', ' ').slice(0, 19)}</td>
                  <td className="px-5 py-3 text-sm text-on-surface">{r.display_name || r.user_email || 'Sistema'}</td>
                  <td className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-secondary">{r.action}</td>
                  <td className="px-5 py-3 text-sm text-on-surface">{r.module || '-'}</td>
                  <td className="px-5 py-3 text-sm text-on-surface">{r.entity_type || '-'} {r.entity_id || ''}</td>
                  <td className="px-5 py-3 text-sm text-on-surface-variant">{r.description || '-'}</td>
                  <td className="px-5 py-3 text-xs font-bold uppercase tracking-wide">{r.status || 'success'}</td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-on-surface-variant">Sin eventos registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
