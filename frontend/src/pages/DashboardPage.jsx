import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

function StatCard({ title, value, note, icon, accent = 'secondary' }) {
  return (
    <article className="bg-surface-container-lowest rounded-xl p-5 shadow-surface">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{title}</p>
        <span className={`material-symbols-outlined text-${accent}`} style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <p className="text-3xl font-headline font-extrabold text-primary-container">{value}</p>
      <p className="text-xs text-on-surface-variant mt-1">{note}</p>
    </article>
  );
}

export default function DashboardPage() {
  const [projects, setProjects] = useState([]);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const to = new Date().toISOString();
        const [projectData, visitsData] = await Promise.all([
          api('/api/projects'),
          api(`/api/visits?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
        ]);
        setProjects(projectData);
        setVisits(visitsData);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const stats = useMemo(() => {
    const totalProjects = projects.length;
    const withManager = projects.filter((p) => p.manager_name).length;
    const totalVisits = visits.length;
    const cancelled = visits.filter((v) => String(v.status).toLowerCase() === 'cancelled').length;
    return { totalProjects, withManager, totalVisits, cancelled };
  }, [projects, visits]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2">
        <h2 className="text-3xl font-headline font-extrabold text-primary-container tracking-tight">Panel de Gestion</h2>
        <p className="text-sm text-on-surface-variant">Vista ejecutiva de proyectos, ejecutivos y actividad de visitas.</p>
      </header>

      {error && (
        <div className="p-3 rounded-md bg-error-container text-on-error-container text-sm font-medium">{error}</div>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Proyectos" value={stats.totalProjects} note="Total registrado" icon="apartment" />
        <StatCard title="Con Ejecutivo" value={stats.withManager} note="Asignacion activa" icon="badge" />
        <StatCard title="Visitas 30 dias" value={stats.totalVisits} note="Reservas y operaciones" icon="event" />
        <StatCard title="Canceladas" value={stats.cancelled} note="Seguimiento comercial" icon="event_busy" accent="on-error-container" />
      </section>

      <section className="bg-surface-container-lowest rounded-xl shadow-surface overflow-hidden">
        <div className="px-5 py-4 bg-surface-container-low flex items-center justify-between">
          <h3 className="text-sm font-headline font-bold text-primary-container">Actividad Reciente</h3>
          <span className="text-xs font-semibold text-on-surface-variant">{loading ? 'Cargando...' : `${visits.length} registros`}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="bg-surface-container-low/40">
                <th className="px-5 py-3 text-[10px] uppercase tracking-widest text-on-surface-variant">Cliente</th>
                <th className="px-5 py-3 text-[10px] uppercase tracking-widest text-on-surface-variant">Proyecto</th>
                <th className="px-5 py-3 text-[10px] uppercase tracking-widest text-on-surface-variant">Ejecutivo</th>
                <th className="px-5 py-3 text-[10px] uppercase tracking-widest text-on-surface-variant">Inicio</th>
                <th className="px-5 py-3 text-[10px] uppercase tracking-widest text-on-surface-variant">Estado</th>
              </tr>
            </thead>
            <tbody>
              {visits.slice(0, 12).map((visit, index) => (
                <tr key={visit.id} style={{ background: index % 2 === 0 ? '#ffffff' : '#f8f9ff' }}>
                  <td className="px-5 py-3 text-sm font-medium text-on-surface">{visit.client_name || 'Sin nombre'}</td>
                  <td className="px-5 py-3 text-sm text-on-surface">{visit.project_name || '-'}</td>
                  <td className="px-5 py-3 text-sm text-on-surface">{visit.executive_name || '-'}</td>
                  <td className="px-5 py-3 text-sm text-on-surface-variant">{String(visit.starts_at || '').replace('T', ' ').slice(0, 16)}</td>
                  <td className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-secondary">
                    {String(visit.status || 'booked').toLowerCase() === 'cancelled' ? 'Cancelada' : 'Reservada'}
                  </td>
                </tr>
              ))}
              {!loading && visits.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-on-surface-variant">No hay actividad reciente.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
