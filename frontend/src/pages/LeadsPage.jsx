import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

const STATUS_STYLES = {
  booked: 'bg-[#e8f0fe] text-secondary',
  cancelled: 'bg-error-container text-on-error-container'
};

function getEstadoLabel(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'cancelled') return 'Cancelada';
  if (normalized === 'booked') return 'Reservada';
  return normalized || 'Reservada';
}

export default function LeadsPage() {
  const [visits, setVisits] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadVisits = async () => {
    setLoading(true);
    setError('');
    try {
      const from = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      const to = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const data = await api(`/api/visits?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      setVisits(data);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVisits();
  }, []);

  const filtered = useMemo(() => {
    return visits.filter((v) => {
      const statusMatch = status === 'all' || String(v.status).toLowerCase() === status;
      const text = `${v.client_name || ''} ${v.project_name || ''} ${v.executive_name || ''} ${v.executive_email || ''}`.toLowerCase();
      const textMatch = text.includes(query.toLowerCase());
      return statusMatch && textMatch;
    });
  }, [visits, query, status]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-headline font-extrabold text-primary-container tracking-tight">Gestion de Citas</h2>
          <p className="text-sm text-on-surface-variant mt-1">Control de leads, reservas y seguimiento comercial.</p>
        </div>
        <button
          onClick={loadVisits}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #000a1e, #002147)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
          Actualizar
        </button>
      </header>

      <section className="bg-surface-container-lowest rounded-xl shadow-surface p-4 md:p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por cliente, proyecto o ejecutivo"
            className="md:col-span-2 bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm"
          >
            <option value="all">Todos los estados</option>
            <option value="booked">Reservadas</option>
            <option value="cancelled">Canceladas</option>
          </select>
        </div>
      </section>

      {error && <div className="p-3 rounded-md bg-error-container text-on-error-container text-sm font-medium">{error}</div>}

      <section className="bg-surface-container-lowest rounded-xl shadow-surface overflow-hidden">
        <div className="px-5 py-4 bg-surface-container-low flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Citas</span>
          <span className="text-xs text-on-surface-variant">{loading ? 'Cargando...' : `${filtered.length} resultados`}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left">
            <thead>
              <tr className="bg-surface-container-low/40">
                <th className="px-5 py-3 text-[10px] uppercase tracking-widest text-on-surface-variant">Cliente</th>
                <th className="px-5 py-3 text-[10px] uppercase tracking-widest text-on-surface-variant">Email</th>
                <th className="px-5 py-3 text-[10px] uppercase tracking-widest text-on-surface-variant">Telefono</th>
                <th className="px-5 py-3 text-[10px] uppercase tracking-widest text-on-surface-variant">RUT</th>
                <th className="px-5 py-3 text-[10px] uppercase tracking-widest text-on-surface-variant">Proyecto</th>
                <th className="px-5 py-3 text-[10px] uppercase tracking-widest text-on-surface-variant">Ejecutivo</th>
                <th className="px-5 py-3 text-[10px] uppercase tracking-widest text-on-surface-variant">Email Ejecutivo</th>
                <th className="px-5 py-3 text-[10px] uppercase tracking-widest text-on-surface-variant">Inicio</th>
                <th className="px-5 py-3 text-[10px] uppercase tracking-widest text-on-surface-variant">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((visit, index) => {
                const key = String(visit.status || '').toLowerCase();
                return (
                  <tr key={visit.id} style={{ background: index % 2 === 0 ? '#ffffff' : '#f8f9ff' }}>
                    <td className="px-5 py-3 text-sm font-medium text-on-surface">{visit.client_name || 'Sin nombre'}</td>
                    <td className="px-5 py-3 text-sm text-on-surface-variant">{visit.client_email || '-'}</td>
                    <td className="px-5 py-3 text-sm text-on-surface-variant">{visit.client_phone || '-'}</td>
                    <td className="px-5 py-3 text-sm text-on-surface-variant">{visit.client_rut || '-'}</td>
                    <td className="px-5 py-3 text-sm text-on-surface">{visit.project_name || '-'}</td>
                    <td className="px-5 py-3 text-sm text-on-surface">{visit.executive_name || '-'}</td>
                    <td className="px-5 py-3 text-sm text-on-surface-variant">{visit.executive_email || '-'}</td>
                    <td className="px-5 py-3 text-sm text-on-surface-variant">{String(visit.starts_at || '').replace('T', ' ').slice(0, 16)}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLES[key] || 'bg-surface-container text-on-surface-variant'}`}>
                        {getEstadoLabel(visit.status)}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-sm text-on-surface-variant">No se encontraron citas con esos filtros.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
