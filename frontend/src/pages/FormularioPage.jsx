import { useEffect, useMemo, useState } from 'react';
import Card from '../components/Card';
import { api } from '../lib/api';

export default function FormularioPage() {
  const [projects, setProjects] = useState([]);
  const [executives, setExecutives] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [executiveId, setExecutiveId] = useState('');
  const [availabilityId, setAvailabilityId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');

  const selectedSlot = useMemo(
    () => availability.find((item) => String(item.id) === availabilityId),
    [availability, availabilityId]
  );

  useEffect(() => {
    const loadProjects = async () => {
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

    loadProjects();
  }, []);

  useEffect(() => {
    if (!projectId) {
      setExecutives([]);
      setExecutiveId('');
      setAvailability([]);
      setAvailabilityId('');
      return;
    }

    const loadExecutives = async () => {
      setLoading(true);
      setError('');
      setExecutiveId('');
      setAvailability([]);
      setAvailabilityId('');
      try {
        const query = new URLSearchParams({ projectId });
        setExecutives(await api(`/api/executives?${query.toString()}`));
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    };

    loadExecutives();
  }, [projectId]);

  useEffect(() => {
    if (!executiveId) {
      setAvailability([]);
      setAvailabilityId('');
      return;
    }

    const loadAvailability = async () => {
      setLoading(true);
      setError('');
      setAvailabilityId('');
      try {
        const query = new URLSearchParams({ projectId, executiveId });
        setAvailability(await api(`/api/availability?${query.toString()}`));
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    };

    loadAvailability();
  }, [executiveId, projectId]);

  const submit = async (event) => {
    event.preventDefault();
    if (!projectId || !executiveId || !availabilityId) {
      setError('Debes seleccionar proyecto, ejecutivo y horario.');
      return;
    }

    const payload = {
      projectId: Number(projectId),
      executiveId: Number(executiveId),
      availabilityId: Number(availabilityId),
      clientName,
      clientEmail
    };

    try {
      setSubmitting(true);
      setError('');
      const data = await api('/api/book', { method: 'POST', body: JSON.stringify(payload) });
      setResult(JSON.stringify(data, null, 2));
      setClientName('');
      setClientEmail('');
      setAvailabilityId('');

      const query = new URLSearchParams({ projectId, executiveId });
      setAvailability(await api(`/api/availability?${query.toString()}`));
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid">
      <Card title="Reserva de Visita Asistida" wide>
        <form onSubmit={submit}>
          <p className="hint">Paso 1: Selecciona proyecto</p>
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)} required>
            <option value="">Selecciona un proyecto</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                #{project.id} {project.name}
              </option>
            ))}
          </select>

          <p className="hint">Paso 2: Selecciona ejecutivo</p>
          <select
            value={executiveId}
            onChange={(event) => setExecutiveId(event.target.value)}
            disabled={!projectId || loading}
            required
          >
            <option value="">Selecciona un ejecutivo</option>
            {executives.map((executive) => (
              <option key={executive.id} value={executive.id}>
                #{executive.id} {executive.name}
              </option>
            ))}
          </select>

          <p className="hint">Paso 3: Selecciona horario disponible</p>
          <select
            value={availabilityId}
            onChange={(event) => setAvailabilityId(event.target.value)}
            disabled={!executiveId || loading}
            required
          >
            <option value="">Selecciona un horario</option>
            {availability.map((slot) => (
              <option key={slot.id} value={slot.id}>
                #{slot.id} {slot.slot_start.replace('T', ' ').slice(0, 16)} - {slot.slot_end.slice(11, 16)}
              </option>
            ))}
          </select>

          {selectedSlot && (
            <div className="summary-box">
              Horario elegido: {selectedSlot.slot_start.replace('T', ' ').slice(0, 16)} - {selectedSlot.slot_end.slice(11, 16)}
            </div>
          )}

          <p className="hint">Paso 4: Datos del cliente</p>
          <input
            name="clientName"
            type="text"
            placeholder="Nombre cliente"
            value={clientName}
            onChange={(event) => setClientName(event.target.value)}
            required
          />
          <input
            name="clientEmail"
            type="email"
            placeholder="Email cliente"
            value={clientEmail}
            onChange={(event) => setClientEmail(event.target.value)}
          />
          <button type="submit" disabled={loading || submitting}>
            {submitting ? 'Reservando...' : 'Reservar'}
          </button>
        </form>

        {loading && <p className="status info">Cargando datos...</p>}
        {error && <p className="status error">{error}</p>}
        {!loading && executiveId && availability.length === 0 && (
          <p className="status warning">No hay disponibilidad abierta para este ejecutivo.</p>
        )}
        <pre>{result}</pre>
      </Card>
    </div>
  );
}
