import { useEffect, useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import Card from '../components/Card';
import { api } from '../lib/api';

function toIso(date, endOfDay = false) {
  return `${date}T${endOfDay ? '23:59:59' : '00:00:00'}`;
}

export default function CalendarioPage() {
  const today = new Date().toISOString().slice(0, 10);
  const plusFourteen = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(plusFourteen);
  const [calendar, setCalendar] = useState({ availability: [], visits: [], blocks: [] });
  const [activeEvent, setActiveEvent] = useState(null);
  const [nextSlots, setNextSlots] = useState([]);
  const [newAvailabilityId, setNewAvailabilityId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadProjects = async () => {
    setProjects(await api('/api/projects'));
  };

  const loadCalendar = async () => {
    setLoading(true);
    setError('');
    const q = new URLSearchParams();
    if (projectId) q.set('projectId', projectId);
    q.set('from', toIso(from));
    q.set('to', toIso(to, true));
    try {
      setCalendar(await api(`/api/calendar?${q.toString()}`));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        await loadProjects();
        await loadCalendar();
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!activeEvent || activeEvent.kind !== 'visit') {
      setNextSlots([]);
      setNewAvailabilityId('');
      return;
    }

    const loadRescheduleOptions = async () => {
      try {
        const query = new URLSearchParams({
          projectId: String(activeEvent.projectId),
          executiveId: String(activeEvent.executiveId)
        });
        const slots = await api(`/api/availability?${query.toString()}`);
        setNextSlots(slots);
      } catch (loadError) {
        setError(loadError.message);
      }
    };

    loadRescheduleOptions();
  }, [activeEvent]);

  const calendarEvents = useMemo(() => {
    const availabilityEvents = calendar.availability.map((slot) => ({
      id: `slot-${slot.id}`,
      title: `Disponible | ${slot.executive_name}`,
      start: slot.slot_start,
      end: slot.slot_end,
      backgroundColor: '#16a34a',
      borderColor: '#16a34a',
      textColor: '#ffffff',
      extendedProps: {
        kind: 'availability',
        slotId: slot.id,
        executiveId: slot.executive_id,
        projectId: slot.project_id,
        executiveName: slot.executive_name
      }
    }));

    const visitEvents = calendar.visits.map((visit) => ({
      id: `visit-${visit.id}`,
      title: `Reserva | ${visit.client_name}`,
      start: visit.starts_at,
      end: visit.ends_at,
      backgroundColor: '#dc2626',
      borderColor: '#dc2626',
      textColor: '#ffffff',
      extendedProps: {
        kind: 'visit',
        visitId: visit.id,
        executiveId: visit.executive_id,
        projectId: visit.project_id,
        clientName: visit.client_name,
        projectName: visit.project_name
      }
    }));

    const blockEvents = calendar.blocks.map((block) => ({
      id: `block-${block.id}`,
      title: `Bloqueado | ${block.reason || 'No disponible'}`,
      start: block.block_start,
      end: block.block_end,
      backgroundColor: '#6b7280',
      borderColor: '#6b7280',
      textColor: '#ffffff',
      extendedProps: {
        kind: 'block',
        reason: block.reason,
        executiveName: block.executive_name
      }
    }));

    return [...availabilityEvents, ...visitEvents, ...blockEvents];
  }, [calendar]);

  const onSelectEvent = (clickInfo) => {
    const kind = clickInfo.event.extendedProps.kind;
    setSuccess('');
    setError('');
    setNewAvailabilityId('');
    setActiveEvent({
      kind,
      title: clickInfo.event.title,
      start: clickInfo.event.startStr,
      end: clickInfo.event.endStr,
      ...clickInfo.event.extendedProps
    });
  };

  const reserveFromCalendar = async (event) => {
    event.preventDefault();
    if (!activeEvent || activeEvent.kind !== 'availability') return;

    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      await api('/api/book', {
        method: 'POST',
        body: JSON.stringify({
          projectId: Number(activeEvent.projectId),
          executiveId: Number(activeEvent.executiveId),
          availabilityId: Number(activeEvent.slotId),
          clientName,
          clientEmail
        })
      });
      setSuccess('Reserva creada desde calendario.');
      setClientName('');
      setClientEmail('');
      setActiveEvent(null);
      await loadCalendar();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setActionLoading(false);
    }
  };

  const rescheduleFromCalendar = async () => {
    if (!activeEvent || activeEvent.kind !== 'visit' || !newAvailabilityId) {
      setError('Selecciona un nuevo horario para reprogramar.');
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      await api('/api/reschedule', {
        method: 'PUT',
        body: JSON.stringify({
          visitId: Number(activeEvent.visitId),
          newAvailabilityId: Number(newAvailabilityId)
        })
      });
      setSuccess('Reserva reprogramada desde calendario.');
      setActiveEvent(null);
      await loadCalendar();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setActionLoading(false);
    }
  };

  const cancelFromCalendar = async () => {
    if (!activeEvent || activeEvent.kind !== 'visit') return;

    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      await api('/api/cancel', {
        method: 'DELETE',
        body: JSON.stringify({
          visitId: Number(activeEvent.visitId)
        })
      });
      setSuccess('Reserva anulada desde calendario.');
      setActiveEvent(null);
      await loadCalendar();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="grid two-col">
      <Card title="Calendario" wide>
        <div className="filters">
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">Todos los proyectos</option>
            {projects.map((p) => <option key={p.id} value={p.id}>#{p.id} {p.name}</option>)}
          </select>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <button onClick={loadCalendar}>Actualizar calendario</button>
        </div>
        <div className="legend">
          <span className="chip available">Disponible</span>
          <span className="chip booked">Reservado</span>
          <span className="chip blocked">Bloqueado</span>
        </div>
        {loading && <p className="status info">Cargando calendario...</p>}
        {error && <p className="status error">{error}</p>}
        {success && <p className="status info">{success}</p>}

        <div className="calendar-shell">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            locale="es"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            buttonText={{
              today: 'Hoy',
              month: 'Mes',
              week: 'Semana',
              day: 'Dia'
            }}
            allDaySlot={false}
            events={calendarEvents}
            eventClick={onSelectEvent}
            height="auto"
          />
        </div>
      </Card>

      <Card title="Acciones desde calendario" wide>
        {!activeEvent && <p className="status warning">Selecciona un evento del calendario para reservar, reprogramar o anular.</p>}

        {activeEvent && activeEvent.kind === 'availability' && (
          <form onSubmit={reserveFromCalendar}>
            <p className="hint">Reservar horario seleccionado</p>
            <div className="summary-box">
              {activeEvent.start.replace('T', ' ').slice(0, 16)} - {activeEvent.end.slice(11, 16)} | {activeEvent.executiveName}
            </div>
            <input
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
              placeholder="Nombre del cliente"
              required
            />
            <input
              type="email"
              value={clientEmail}
              onChange={(event) => setClientEmail(event.target.value)}
              placeholder="Email del cliente (opcional)"
            />
            <button type="submit" disabled={actionLoading}>{actionLoading ? 'Reservando...' : 'Confirmar reserva'}</button>
          </form>
        )}

        {activeEvent && activeEvent.kind === 'visit' && (
          <div>
            <p className="hint">Gestionar reserva seleccionada</p>
            <div className="summary-box">
              Visita #{activeEvent.visitId} | {activeEvent.clientName} | {activeEvent.projectName}
            </div>

            <select value={newAvailabilityId} onChange={(event) => setNewAvailabilityId(event.target.value)}>
              <option value="">Selecciona nuevo horario para reprogramar</option>
              {nextSlots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  #{slot.id} {slot.slot_start.replace('T', ' ').slice(0, 16)} - {slot.slot_end.slice(11, 16)}
                </option>
              ))}
            </select>
            <div className="action-row">
              <button type="button" onClick={rescheduleFromCalendar} disabled={actionLoading || !newAvailabilityId}>
                {actionLoading ? 'Procesando...' : 'Reprogramar'}
              </button>
              <button type="button" className="danger" onClick={cancelFromCalendar} disabled={actionLoading}>
                {actionLoading ? 'Procesando...' : 'Anular reserva'}
              </button>
            </div>
          </div>
        )}

        {activeEvent && activeEvent.kind === 'block' && (
          <p className="status warning">Este bloque esta marcado como no disponible y no admite acciones.</p>
        )}
      </Card>
    </div>
  );
}
