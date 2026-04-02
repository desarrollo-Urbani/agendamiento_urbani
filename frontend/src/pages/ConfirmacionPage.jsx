import { useEffect, useMemo, useState } from 'react';
import Card from '../components/Card';
import { api } from '../lib/api';

export default function ConfirmacionPage() {
  const [projects, setProjects] = useState([]);
  const [visits, setVisits] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [visitId, setVisitId] = useState('');
  const [newAvailabilityId, setNewAvailabilityId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');

  const selectedVisit = useMemo(
    () => visits.find((visit) => String(visit.id) === visitId),
    [visits, visitId]
  );

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        const [projectList, visitList] = await Promise.all([api('/api/projects'), api('/api/visits')]);
        setProjects(projectList);
        setVisits(visitList);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    setVisitId('');
    setNewAvailabilityId('');
    setAvailability([]);
  }, [projectId]);

  useEffect(() => {
    if (!selectedVisit) {
      setAvailability([]);
      setNewAvailabilityId('');
      return;
    }

    const loadAvailability = async () => {
      setLoading(true);
      setError('');
      setNewAvailabilityId('');
      try {
        const query = new URLSearchParams({
          projectId: String(selectedVisit.project_id),
          executiveId: String(selectedVisit.executive_id)
        });
        setAvailability(await api(`/api/availability?${query.toString()}`));
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    };

    loadAvailability();
  }, [selectedVisit]);

  const visibleVisits = useMemo(() => {
    const activeVisits = visits.filter((visit) => visit.status === 'booked');
    if (!projectId) return activeVisits;
    return activeVisits.filter((visit) => String(visit.project_id) === projectId);
  }, [projectId, visits]);

  const reschedule = async (event) => {
    event.preventDefault();
    if (!visitId || !newAvailabilityId) {
      setError('Selecciona visita y nuevo horario para reprogramar.');
      return;
    }

    const payload = {
      visitId: Number(visitId),
      newAvailabilityId: Number(newAvailabilityId)
    };

    try {
      setError('');
      setResult(JSON.stringify(await api('/api/reschedule', { method: 'PUT', body: JSON.stringify(payload) }), null, 2));

      const updatedVisits = await api('/api/visits');
      setVisits(updatedVisits);
    } catch (error) {
      setError(error.message);
    }
  };

  const cancel = async (event) => {
    event.preventDefault();
    if (!visitId) {
      setError('Selecciona una visita para cancelar.');
      return;
    }

    const payload = { visitId: Number(visitId) };

    try {
      setError('');
      setResult(JSON.stringify(await api('/api/cancel', { method: 'DELETE', body: JSON.stringify(payload) }), null, 2));

      const updatedVisits = await api('/api/visits');
      setVisits(updatedVisits);
      setVisitId('');
      setNewAvailabilityId('');
      setAvailability([]);
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="grid two-col">
      <Card title="Seleccion de Visita" wide>
        <div className="filters">
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <option value="">Todos los proyectos</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                #{project.id} {project.name}
              </option>
            ))}
          </select>
          <select value={visitId} onChange={(event) => setVisitId(event.target.value)}>
            <option value="">Selecciona una visita activa</option>
            {visibleVisits.map((visit) => (
              <option key={visit.id} value={visit.id}>
                #{visit.id} {visit.client_name} - {visit.starts_at.replace('T', ' ').slice(0, 16)}
              </option>
            ))}
          </select>
        </div>
        {loading && <p className="status info">Cargando datos...</p>}
        {error && <p className="status error">{error}</p>}
      </Card>

      <Card title="Reprogramar">
        <form onSubmit={reschedule}>
          <select
            value={newAvailabilityId}
            onChange={(event) => setNewAvailabilityId(event.target.value)}
            disabled={!selectedVisit || loading}
            required
          >
            <option value="">Selecciona un nuevo horario</option>
            {availability.map((slot) => (
              <option key={slot.id} value={slot.id}>
                #{slot.id} {slot.slot_start.replace('T', ' ').slice(0, 16)} - {slot.slot_end.slice(11, 16)}
              </option>
            ))}
          </select>
          <button type="submit">Reprogramar</button>
        </form>
      </Card>
      <Card title="Cancelar">
        <form onSubmit={cancel}>
          <button type="submit">Cancelar</button>
        </form>
      </Card>
      <Card title="Resultado" wide>
        <pre>{result}</pre>
      </Card>
    </div>
  );
}
