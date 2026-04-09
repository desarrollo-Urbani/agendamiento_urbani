import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';

export default function ProjectHistoryPage() {
  const { id } = useParams();
  const [rows, setRows] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filters, setFilters] = useState({ action: '', module: '', from: '', to: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [p, h] = await Promise.all([
        api('/api/projects'),
        api(`/api/projects/${id}/history?${new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([,v]) => v))).toString()}`)
      ]);
      setProjects(p);
      setRows(h);
    } catch (err) {
      setError(err.message || 'No se pudo cargar historial');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const project = projects.find((p) => String(p.id) === String(id));

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-headline font-extrabold text-primary-container tracking-tight">Historial del Proyecto</h2>
        <p className="text-sm text-on-surface-variant mt-1">{project ? `#${project.id} ${project.name}` : `Proyecto #${id}`}</p>
      </header>

      <section className="bg-surface-container-lowest rounded-xl shadow-surface p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <input placeholder="Accion" value={filters.action} onChange={(e)=>setFilters((f)=>({...f,action:e.target.value}))} className="bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm" />
        <input placeholder="Modulo" value={filters.module} onChange={(e)=>setFilters((f)=>({...f,module:e.target.value}))} className="bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm" />
        <input type="datetime-local" value={filters.from} onChange={(e)=>setFilters((f)=>({...f,from:e.target.value}))} className="bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm" />
        <input type="datetime-local" value={filters.to} onChange={(e)=>setFilters((f)=>({...f,to:e.target.value}))} className="bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm" />
        <button onClick={load} className="text-white text-sm font-semibold px-4 py-2 rounded-md" style={{ background: 'linear-gradient(135deg, #000a1e, #002147)' }}>Filtrar</button>
      </section>

      {error && <div className="p-3 rounded-md bg-error-container text-on-error-container text-sm">{error}</div>}

      <section className="bg-surface-container-lowest rounded-xl shadow-surface overflow-hidden">
        <div className="px-5 py-4 bg-surface-container-low flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Trazabilidad</span>
          <span className="text-xs text-on-surface-variant">{loading ? 'Cargando...' : `${rows.length} eventos`}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
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
                  <td className="px-5 py-3 text-sm text-on-surface-variant">{String(r.created_at).replace('T',' ').slice(0,19)}</td>
                  <td className="px-5 py-3 text-sm text-on-surface">{r.display_name || r.user_email || 'Sistema'}</td>
                  <td className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-secondary">{r.action}</td>
                  <td className="px-5 py-3 text-sm text-on-surface">{r.module || '-'}</td>
                  <td className="px-5 py-3 text-sm text-on-surface">{r.entity_type || '-'} {r.entity_id || ''}</td>
                  <td className="px-5 py-3 text-sm text-on-surface-variant">{r.description || '-'}</td>
                  <td className="px-5 py-3 text-xs font-bold uppercase tracking-wide">{r.status || 'success'}</td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-on-surface-variant">Sin eventos para este proyecto.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
