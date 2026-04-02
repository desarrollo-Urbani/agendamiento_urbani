import { useEffect, useState } from 'react';
import Card from '../components/Card';
import { api } from '../lib/api';

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
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!projectId) {
      resetForm();
      return;
    }

    const current = projects.find((project) => String(project.id) === projectId);
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

    const payload = {
      name,
      attentionHours,
      executiveName,
      executiveEmail
    };

    try {
      if (projectId) {
        await api(`/api/projects/${projectId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        setStatus('Proyecto actualizado correctamente.');
      } else {
        await api('/api/projects', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        setStatus('Proyecto creado correctamente.');
      }

      await load();
      if (!projectId) {
        resetForm();
      }
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid two-col">
      <Card title="Administrar Proyectos" wide>
        <form onSubmit={save}>
          <div className="filters">
            <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
              <option value="">Nuevo proyecto</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  Editar #{project.id} {project.name}
                </option>
              ))}
            </select>
            <button type="button" onClick={resetForm}>Limpiar formulario</button>
          </div>

          <p className="hint">Nombre del proyecto</p>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ej: New Cycle"
            required
          />

          <p className="hint">Horario de atencion</p>
          <input
            value={attentionHours}
            onChange={(event) => setAttentionHours(event.target.value)}
            placeholder="Ej: Lunes a Viernes 10:00 a 14:00 y 15:00 a 18:00"
            required
          />

          <p className="hint">Ejecutivo encargado presencial</p>
          <input
            value={executiveName}
            onChange={(event) => setExecutiveName(event.target.value)}
            placeholder="Nombre del ejecutivo"
            required
          />
          <input
            type="email"
            value={executiveEmail}
            onChange={(event) => setExecutiveEmail(event.target.value)}
            placeholder="Email del ejecutivo (opcional)"
          />

          <button type="submit" disabled={saving || loading}>
            {saving ? 'Guardando...' : projectId ? 'Actualizar proyecto' : 'Crear proyecto'}
          </button>
        </form>

        {status && <p className="status info">{status}</p>}
        {error && <p className="status error">{error}</p>}
      </Card>

      <Card title="Catalogo actual" wide>
        <button onClick={load} disabled={loading}>{loading ? 'Actualizando...' : 'Actualizar listado'}</button>
        <ul className="list">
          {projects.map((project) => (
            <li key={project.id}>
              <strong>#{project.id}</strong> {project.name} | Horario: {project.attention_hours || '-'} | Encargado: {project.manager_name || 'Sin asignar'}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
