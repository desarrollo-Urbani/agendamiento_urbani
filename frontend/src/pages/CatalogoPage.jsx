import { useEffect, useState } from 'react';
import { api } from '../lib/api';

function StatusBadge({ project }) {
  // Derive a visual status from attention_hours presence
  const hasExec = !!project.manager_name;
  if (!hasExec) return (
    <span className="px-3 py-1 bg-error-container text-on-error-container text-[10px] font-bold uppercase tracking-wide rounded-full">Sin ejecutivo</span>
  );
  return (
    <span className="px-3 py-1 bg-[#d6e3ff] text-[#002147] text-[10px] font-bold uppercase tracking-wide rounded-full">Activo</span>
  );
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

  return (
    <div>
      {/* Page Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-headline font-extrabold text-primary-container tracking-tight">Inventario de Proyectos</h2>
          <p className="text-on-surface-variant text-sm mt-1 font-body">Administracion y supervision de proyectos inmobiliarios.</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2 rounded-md active:scale-95 transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #000a1e, #002147)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          Nuevo Proyecto
        </button>
      </div>

      {/* Metric bento */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-surface-container-lowest p-5 rounded-xl flex flex-col gap-1">
          <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">Proyectos Activos</span>
          <span className="text-2xl font-headline font-bold text-on-surface">{projects.length}</span>
          <div className="mt-2 w-full bg-surface-container-low h-1.5 rounded-full overflow-hidden">
            <div className="bg-secondary h-full" style={{ width: '70%' }}></div>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-xl flex flex-col gap-1">
          <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">Con Ejecutivo</span>
          <span className="text-2xl font-headline font-bold text-on-surface">{projects.filter(p => p.manager_name).length}</span>
          <span className="text-xs text-secondary font-medium">de {projects.length} proyectos</span>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-xl flex flex-col gap-1">
          <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">Sin Ejecutivo</span>
          <span className="text-2xl font-headline font-bold text-on-surface">{projects.filter(p => !p.manager_name).length}</span>
          <span className="text-xs text-on-error-container font-medium">requieren atencion</span>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-xl flex flex-col gap-1">
          <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">Con Horario</span>
          <span className="text-2xl font-headline font-bold text-on-surface">{projects.filter(p => p.attention_hours).length}</span>
          <span className="text-xs text-on-surface-variant font-medium">horario configurado</span>
        </div>
      </div>

      {/* Project form panel (slide in when showForm) */}
      {showForm && (
        <div className="bg-surface-container-lowest rounded-xl p-6 mb-6 shadow-surface">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-headline font-bold text-on-surface text-lg">
              {projectId ? `Editar Proyecto #${projectId}` : 'Nuevo Proyecto'}
            </h3>
            <button onClick={resetForm} className="p-1.5 text-on-surface-variant hover:bg-surface-container-low rounded transition-colors">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
            </button>
          </div>
          <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Nombre del Proyecto</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Condominio Las Palmas"
                required
                className="bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Horario de Atenci&oacute;n</label>
              <input
                value={attentionHours}
                onChange={(e) => setAttentionHours(e.target.value)}
                placeholder="Ej: Lun-Vie 10:00-18:00"
                required
                className="bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Ejecutivo Encargado</label>
              <input
                value={executiveName}
                onChange={(e) => setExecutiveName(e.target.value)}
                placeholder="Nombre completo"
                required
                className="bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Email del Ejecutivo</label>
              <input
                type="email"
                value={executiveEmail}
                onChange={(e) => setExecutiveEmail(e.target.value)}
                placeholder="ejecutivo@empresa.com"
                className="bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
              />
            </div>
            <div className="md:col-span-2 flex items-center justify-between pt-2">
              {status && <p className="text-sm text-secondary font-medium">{status}</p>}
              {error && <p className="text-sm text-error font-medium">{error}</p>}
              {!status && !error && <span />}
              <div className="flex gap-3">
                <button type="button" onClick={resetForm} className="px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low rounded-md transition-colors">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || loading}
                  className="flex items-center gap-2 text-white text-sm font-semibold px-5 py-2 rounded-md active:scale-95 transition-all disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #000a1e, #002147)' }}
                >
                  {saving ? 'Guardando...' : projectId ? 'Actualizar' : 'Crear proyecto'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Projects table */}
      <div className="bg-surface-container-lowest rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-surface-container-low">
          <span className="text-xs font-label uppercase tracking-widest text-on-surface-variant font-bold">
            {loading ? 'Cargando...' : `${projects.length} proyectos`}
          </span>
          <button onClick={load} disabled={loading} className="flex items-center gap-1.5 text-xs font-semibold text-secondary hover:opacity-80 transition-opacity">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
            Actualizar
          </button>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-surface-container-low/60">
              <th className="px-6 py-4 text-[10px] font-label uppercase tracking-widest text-on-surface-variant">Proyecto</th>
              <th className="px-6 py-4 text-[10px] font-label uppercase tracking-widest text-on-surface-variant">Horario</th>
              <th className="px-6 py-4 text-[10px] font-label uppercase tracking-widest text-on-surface-variant">Ejecutivo</th>
              <th className="px-6 py-4 text-[10px] font-label uppercase tracking-widest text-on-surface-variant">Estado</th>
              <th className="px-6 py-4 text-[10px] font-label uppercase tracking-widest text-on-surface-variant text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project, i) => (
              <tr
                key={project.id}
                className="transition-colors hover:bg-surface-container-low/30"
                style={{ background: i % 2 === 0 ? '#ffffff' : '#f8f9ff' }}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary-container/10">
                      <span className="material-symbols-outlined text-primary-container" style={{ fontSize: 20 }}>apartment</span>
                    </div>
                    <div>
                      <span className="block font-headline font-bold text-on-surface text-sm">#{project.id} {project.name}</span>
                      <span className="text-xs text-on-surface-variant font-body">Proyecto inmobiliario</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-on-surface">{project.attention_hours || <span className="text-on-surface-variant italic text-xs">No configurado</span>}</span>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <span className="block text-sm font-medium text-on-surface">{project.manager_name || '—'}</span>
                    {project.manager_email && <span className="text-xs text-on-surface-variant">{project.manager_email}</span>}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge project={project} />
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => openEdit(project)}
                    className="px-3 py-1.5 text-xs font-bold bg-secondary text-white rounded-md shadow-sm hover:opacity-90 transition-opacity active:scale-95"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
            {!loading && projects.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant text-sm">
                  No hay proyectos. Crea el primero con el botón &quot;Nuevo Proyecto&quot;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
