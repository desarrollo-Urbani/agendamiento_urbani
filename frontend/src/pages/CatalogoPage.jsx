import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

function StatusBadge({ project }) {
  const status = String(project.status || 'active').toLowerCase();
  if (status === 'paused') return <span className="px-3 py-1 bg-[#ffdbcb] text-[#6c391d] text-[10px] font-bold uppercase tracking-wide rounded-full">Pausado</span>;
  if (status === 'archived') return <span className="px-3 py-1 bg-surface-container text-on-surface-variant text-[10px] font-bold uppercase tracking-wide rounded-full">Archivado</span>;
  if (!project.manager_name) return <span className="px-3 py-1 bg-error-container text-on-error-container text-[10px] font-bold uppercase tracking-wide rounded-full">Sin ejecutivo</span>;
  return <span className="px-3 py-1 bg-[#d6e3ff] text-[#002147] text-[10px] font-bold uppercase tracking-wide rounded-full">Activo</span>;
}

export default function CatalogoPage() {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [name, setName] = useState('');
  const [attentionHours, setAttentionHours] = useState('');
  const [executiveName, setExecutiveName] = useState('');
  const [executiveEmail, setExecutiveEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setProjects(await api('/api/projects'));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setProjectId('');
    setName('');
    setAttentionHours('');
    setExecutiveName('');
    setExecutiveEmail('');
    setShowForm(false);
    setStatus('');
    setError('');
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!projectId) { resetForm(); return; }
    const current = projects.find((p) => String(p.id) === projectId);
    if (!current) return;
    setName(current.name || '');
    setAttentionHours(current.attention_hours || '');
    setExecutiveName(current.manager_name || '');
    setExecutiveEmail(current.manager_email || '');
  }, [projectId, projects]);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setStatus('');
    const payload = { name, attentionHours, executiveName, executiveEmail };
    try {
      if (projectId) {
        await api(`/api/projects/${projectId}`, { method: 'PUT', body: JSON.stringify(payload) });
        setStatus('Proyecto actualizado correctamente.');
      } else {
        await api('/api/projects', { method: 'POST', body: JSON.stringify(payload) });
        setStatus('Proyecto creado correctamente.');
      }
      await load();
      if (!projectId) resetForm();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const openNew = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (project) => {
    setProjectId(String(project.id));
    setName(project.name || '');
    setAttentionHours(project.attention_hours || '');
    setExecutiveName(project.manager_name || '');
    setExecutiveEmail(project.manager_email || '');
    setShowForm(true);
    setStatus('');
    setError('');
  };

  const changeStatus = async (project, nextStatus) => {
    setError('');
    setStatus('');
    try {
      await api(`/api/projects/${project.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: nextStatus }) });
      setStatus(`Estado actualizado a ${nextStatus}.`);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const removeProject = async (project) => {
    if (!window.confirm(`Eliminar logicamente el proyecto "${project.name}"?`)) return;
    setError('');
    setStatus('');
    try {
      await api(`/api/projects/${project.id}`, { method: 'DELETE' });
      setStatus('Proyecto eliminado logicamente.');
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-headline font-extrabold text-primary-container tracking-tight">Inventario de Proyectos</h2>
          <p className="text-on-surface-variant text-sm mt-1 font-body">Administracion y supervision de proyectos inmobiliarios.</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2 rounded-md" style={{ background: 'linear-gradient(135deg, #000a1e, #002147)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          Nuevo Proyecto
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <div className="bg-surface-container-lowest p-5 rounded-xl flex flex-col gap-1">
          <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">Proyectos Activos</span>
          <span className="text-2xl font-headline font-bold text-on-surface">{projects.length}</span>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-xl flex flex-col gap-1">
          <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">Con Ejecutivo</span>
          <span className="text-2xl font-headline font-bold text-on-surface">{projects.filter((p) => p.manager_name).length}</span>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-xl flex flex-col gap-1">
          <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">Sin Ejecutivo</span>
          <span className="text-2xl font-headline font-bold text-on-surface">{projects.filter((p) => !p.manager_name).length}</span>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-xl flex flex-col gap-1">
          <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">Pausados</span>
          <span className="text-2xl font-headline font-bold text-on-surface">{projects.filter((p) => p.status === 'paused').length}</span>
        </div>
      </div>

      {showForm && (
        <div className="bg-surface-container-lowest rounded-xl p-6 mb-6 shadow-surface">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-headline font-bold text-on-surface text-lg">{projectId ? `Editar Proyecto #${projectId}` : 'Nuevo Proyecto'}</h3>
            <button onClick={resetForm} className="p-1.5 text-on-surface-variant hover:bg-surface-container-low rounded transition-colors">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
            </button>
          </div>
          <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del proyecto" required className="bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm" />
            <input value={attentionHours} onChange={(e) => setAttentionHours(e.target.value)} placeholder="Horario de atencion" required className="bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm" />
            <input value={executiveName} onChange={(e) => setExecutiveName(e.target.value)} placeholder="Ejecutivo" required className="bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm" />
            <input type="email" value={executiveEmail} onChange={(e) => setExecutiveEmail(e.target.value)} placeholder="correo@empresa.com" className="bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm" />
            <div className="md:col-span-2 flex items-center justify-between pt-2">
              {status && <p className="text-sm text-secondary font-medium">{status}</p>}
              {error && <p className="text-sm text-error font-medium">{error}</p>}
              {!status && !error && <span />}
              <button type="submit" disabled={saving || loading} className="text-white text-sm font-semibold px-5 py-2 rounded-md disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #000a1e, #002147)' }}>
                {saving ? 'Guardando...' : projectId ? 'Actualizar' : 'Crear proyecto'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-surface-container-lowest rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-surface-container-low">
          <span className="text-xs font-label uppercase tracking-widest text-on-surface-variant font-bold">{loading ? 'Cargando...' : `${projects.length} proyectos`}</span>
          <button onClick={load} disabled={loading} className="flex items-center gap-1.5 text-xs font-semibold text-secondary">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
            Actualizar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="bg-surface-container-low/60">
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-on-surface-variant">Proyecto</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-on-surface-variant">Horario</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-on-surface-variant">Ejecutivo</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-on-surface-variant">Estado</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-on-surface-variant text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project, i) => (
                <tr key={project.id} style={{ background: i % 2 === 0 ? '#ffffff' : '#f8f9ff' }}>
                  <td className="px-6 py-4 text-sm font-medium">#{project.id} {project.name}</td>
                  <td className="px-6 py-4 text-sm">{project.attention_hours || '-'}</td>
                  <td className="px-6 py-4 text-sm">{project.manager_name || '-'}</td>
                  <td className="px-6 py-4"><StatusBadge project={project} /></td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <Link to={`/proyectos/${project.id}/historial`} className="px-3 py-1.5 text-xs font-bold bg-surface-container text-on-surface rounded-md">Historial</Link>
                      <button onClick={() => changeStatus(project, 'active')} className="px-3 py-1.5 text-xs font-bold bg-[#d6e3ff] text-[#002147] rounded-md">Activar</button>
                      <button onClick={() => changeStatus(project, 'paused')} className="px-3 py-1.5 text-xs font-bold bg-[#ffdbcb] text-[#6c391d] rounded-md">Pausar</button>
                      <button onClick={() => openEdit(project)} className="px-3 py-1.5 text-xs font-bold bg-secondary text-white rounded-md">Editar</button>
                      <button onClick={() => removeProject(project)} className="px-3 py-1.5 text-xs font-bold bg-error-container text-on-error-container rounded-md">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && projects.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-on-surface-variant">No hay proyectos.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
