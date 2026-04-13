import { useEffect, useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { api } from '../lib/api';
import { useAuth } from '../auth/AuthContext';

function toIso(date, endOfDay = false) {
  return `${date}T${endOfDay ? '23:59:59' : '00:00:00'}`;
}

function FieldLabel({ children }) {
  return <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">{children}</label>;
}

function ActionPanel({ activeEvent, nextSlots, newAvailabilityId, setNewAvailabilityId,
  clientName, setClientName, clientEmail, setClientEmail, clientPhone, setClientPhone, clientRut, setClientRut,
  actionLoading, reserveFromCalendar, rescheduleFromCalendar, cancelFromCalendar,
  canBlock, blockReason, setBlockReason, blockSelectedSlot,
  canManageVisits
}) {
  if (!activeEvent) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <span className="material-symbols-outlined text-on-surface-variant/40" style={{ fontSize: 48 }}>touch_app</span>
        <p className="text-sm text-on-surface-variant font-medium">Selecciona un evento del calendario<br/>para ver las opciones disponibles.</p>
      </div>
    );
  }

  if (!canManageVisits) {
    return (
      <div className="p-3 bg-surface-container-low rounded-md text-xs text-on-surface-variant font-medium">
        Perfil lector: solo visualizacion de calendario y citas.
      </div>
    );
  }

  if (activeEvent.kind === 'availability') {
    return (
      <form onSubmit={reserveFromCalendar} className="space-y-4">
        <div className="flex items-center gap-2 p-3 bg-[#e6f4ea] rounded-md">
          <span className="material-symbols-outlined text-[#1e8e3e]" style={{ fontSize: 18 }}>event_available</span>
          <div>
            <span className="block text-xs font-bold text-[#1e8e3e]">Horario Disponible</span>
            <span className="text-xs text-on-surface-variant">
              {activeEvent.start.replace('T', ' ').slice(0, 16)} – {activeEvent.end.slice(11, 16)}
            </span>
          </div>
        </div>
        <div>
          <FieldLabel>Ejecutivo</FieldLabel>
          <p className="text-sm font-medium text-on-surface">{activeEvent.executiveName}</p>
        </div>
        <div>
          <FieldLabel>Nombre del Cliente</FieldLabel>
          <input
            value={clientName} onChange={(e) => setClientName(e.target.value)}
            placeholder="Nombre completo" required
            className="w-full bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
          />
        </div>
        <div>
          <FieldLabel>Email del Cliente</FieldLabel>
          <input
            type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            className="w-full bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
          />
        </div>
        <div>
          <FieldLabel>Telefono del Cliente</FieldLabel>
          <input
            value={clientPhone} onChange={(e) => setClientPhone(e.target.value)}
            placeholder="+569 1234 5678"
            className="w-full bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
          />
        </div>
        <div>
          <FieldLabel>RUT del Cliente</FieldLabel>
          <input
            value={clientRut} onChange={(e) => setClientRut(e.target.value)}
            placeholder="12.345.678-9"
            className="w-full bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
          />
        </div>
        <button
          type="submit" disabled={actionLoading}
          className="w-full flex items-center justify-center gap-2 text-white text-sm font-semibold py-2.5 rounded-md active:scale-95 transition-all disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #000a1e, #002147)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>bookmark_add</span>
          {actionLoading ? 'Reservando...' : 'Confirmar Reserva'}
        </button>
        {canBlock && (
          <>
            <div>
              <FieldLabel>Motivo de bloqueo (admin)</FieldLabel>
              <input
                value={blockReason} onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Ej: Reunion interna"
                className="w-full bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
              />
            </div>
            <button
              type="button"
              onClick={blockSelectedSlot}
              disabled={actionLoading}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-md active:scale-95 transition-all disabled:opacity-40 text-on-error-container bg-error-container hover:opacity-90"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>block</span>
              {actionLoading ? 'Procesando...' : 'Bloquear horario'}
            </button>
          </>
        )}
      </form>
    );
  }

  if (activeEvent.kind === 'visit') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 p-3 bg-[#e8f0fe] rounded-md">
          <span className="material-symbols-outlined text-secondary" style={{ fontSize: 18 }}>event</span>
          <div>
            <span className="block text-xs font-bold text-secondary">Visita #{activeEvent.visitId}</span>
            <span className="text-xs text-on-surface-variant">{activeEvent.clientName} · {activeEvent.projectName}</span>
          </div>
        </div>
        <div>
          <FieldLabel>Nuevo horario (reprogramar)</FieldLabel>
          <select
            value={newAvailabilityId} onChange={(e) => setNewAvailabilityId(e.target.value)}
            className="w-full bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
          >
            <option value="">Selecciona un nuevo horario</option>
            {nextSlots.map((slot) => (
              <option key={slot.id} value={slot.id}>
                #{slot.id} {slot.slot_start.replace('T', ' ').slice(0, 16)} – {slot.slot_end.slice(11, 16)}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={rescheduleFromCalendar} disabled={actionLoading || !newAvailabilityId}
          className="w-full flex items-center justify-center gap-2 text-white text-sm font-semibold py-2.5 rounded-md active:scale-95 transition-all disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #000a1e, #002147)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>event_repeat</span>
          {actionLoading ? 'Procesando...' : 'Reprogramar'}
        </button>
        <button
          onClick={cancelFromCalendar} disabled={actionLoading}
          className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-md active:scale-95 transition-all disabled:opacity-40 text-on-error-container bg-error-container hover:opacity-90"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>event_busy</span>
          {actionLoading ? 'Procesando...' : 'Anular Reserva'}
        </button>
      </div>
    );
  }

  if (activeEvent.kind === 'selection') {
    return (
      <form onSubmit={reserveFromCalendar} className="space-y-4">
        <div className="flex items-center gap-2 p-3 bg-[#fff8e1] rounded-md">
          <span className="material-symbols-outlined text-[#8d6e00]" style={{ fontSize: 18 }}>schedule</span>
          <div>
            <span className="block text-xs font-bold text-[#8d6e00]">Horario seleccionado</span>
            <span className="text-xs text-on-surface-variant">
              {activeEvent.start.replace('T', ' ').slice(0, 16)} – {activeEvent.end.slice(11, 16)}
            </span>
          </div>
        </div>
        <div>
          <FieldLabel>Ejecutivo</FieldLabel>
          <p className="text-sm font-medium text-on-surface">{activeEvent.executiveName || 'Sin ejecutivo asignado'}</p>
        </div>
        <div>
          <FieldLabel>Nombre del Cliente</FieldLabel>
          <input
            value={clientName} onChange={(e) => setClientName(e.target.value)}
            placeholder="Nombre completo" required
            className="w-full bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
          />
        </div>
        <div>
          <FieldLabel>Email del Cliente</FieldLabel>
          <input
            type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            className="w-full bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
          />
        </div>
        <div>
          <FieldLabel>Telefono del Cliente</FieldLabel>
          <input
            value={clientPhone} onChange={(e) => setClientPhone(e.target.value)}
            placeholder="+569 1234 5678"
            className="w-full bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
          />
        </div>
        <div>
          <FieldLabel>RUT del Cliente</FieldLabel>
          <input
            value={clientRut} onChange={(e) => setClientRut(e.target.value)}
            placeholder="12.345.678-9"
            className="w-full bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
          />
        </div>
        <button
          type="submit" disabled={actionLoading || !activeEvent.executiveId}
          className="w-full flex items-center justify-center gap-2 text-white text-sm font-semibold py-2.5 rounded-md active:scale-95 transition-all disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #000a1e, #002147)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>bookmark_add</span>
          {actionLoading ? 'Reservando...' : 'Reservar horario seleccionado'}
        </button>
        {canBlock && (
          <>
            <div>
              <FieldLabel>Motivo de bloqueo (admin)</FieldLabel>
              <input
                value={blockReason} onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Ej: Colacion / mantencion"
                className="w-full bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
              />
            </div>
            <button
              type="button"
              onClick={blockSelectedSlot}
              disabled={actionLoading || !activeEvent.executiveId}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-md active:scale-95 transition-all disabled:opacity-40 text-on-error-container bg-error-container hover:opacity-90"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>block</span>
              {actionLoading ? 'Procesando...' : 'Bloquear horario'}
            </button>
          </>
        )}
      </form>
    );
  }

  return (
    <div className="p-3 bg-surface-container-low rounded-md text-xs text-on-surface-variant font-medium">
      Este bloque esta marcado como no disponible.
    </div>
  );
}

export default function CalendarioPage() {
  const { user } = useAuth();
  const normalizedRole = String(user?.role || '').toLowerCase() === 'executive'
    ? 'usuario'
    : String(user?.role || '').toLowerCase();
  const isLector = normalizedRole === 'lector';
  const canManageVisits = normalizedRole === 'admin' || normalizedRole === 'usuario';
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
  const [clientPhone, setClientPhone] = useState('');
  const [clientRut, setClientRut] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isNarrow, setIsNarrow] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 1024 : false));

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const loadProjects = async () => {
    const data = await api('/api/projects');
    const arr = Array.isArray(data) ? data : [];
    setProjects(arr);
    if (isLector && !projectId && arr[0]) {
      setProjectId(String(arr[0].id));
    }
  };

  const loadCalendar = async () => {
    setLoading(true);
    setError('');
    const q = new URLSearchParams();
    if (isLector && !projectId) {
      setLoading(false);
      setCalendar({ availability: [], visits: [], blocks: [] });
      setError('Debes seleccionar un proyecto para visualizar el calendario.');
      return;
    }
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
        setNextSlots(await api(`/api/availability?${query.toString()}`));
      } catch (loadError) {
        setError(loadError.message);
      }
    };
    loadRescheduleOptions();
  }, [activeEvent]);

  const calendarEvents = useMemo(() => {
    const avail = calendar.availability.map((slot) => ({
      id: `slot-${slot.id}`,
      title: `Disponible · ${slot.executive_name}`,
      start: slot.slot_start,
      end: slot.slot_end,
      backgroundColor: '#e6f4ea',
      borderColor: 'transparent',
      textColor: '#1e8e3e',
      classNames: ['fc-event-available'],
      extendedProps: { kind: 'availability', slotId: slot.id, executiveId: slot.executive_id, projectId: slot.project_id, executiveName: slot.executive_name }
    }));

    const visits = calendar.visits.map((visit) => ({
      id: `visit-${visit.id}`,
      title: `Reserva · ${visit.client_name}`,
      start: visit.starts_at,
      end: visit.ends_at,
      backgroundColor: '#e8f0fe',
      borderColor: 'transparent',
      textColor: '#002147',
      classNames: ['fc-event-visit'],
      extendedProps: { kind: 'visit', visitId: visit.id, executiveId: visit.executive_id, projectId: visit.project_id, clientName: visit.client_name, projectName: visit.project_name }
    }));

    const blocks = calendar.blocks.map((block) => ({
      id: `block-${block.id || block.executive_id + block.block_start}`,
      title: `Bloqueado · ${block.reason || 'No disponible'}`,

      start: block.block_start,
      end: block.block_end,
      backgroundColor: '#f1f3f4',
      borderColor: 'transparent',
      textColor: '#44474e',
      classNames: ['fc-event-block'],
      extendedProps: { kind: 'block', reason: block.reason, executiveName: block.executive_name }
    }));

    return [...avail, ...visits, ...blocks];
  }, [calendar]);

  const onSelectEvent = (clickInfo) => {
    if (!projectId) {
      setError('Selecciona un proyecto para habilitar el calendario.');
      return;
    }
    setSuccess('');
    setError('');
    setNewAvailabilityId('');
    setActiveEvent({
      kind: clickInfo.event.extendedProps.kind,
      title: clickInfo.event.title,
      start: clickInfo.event.startStr,
      end: clickInfo.event.endStr,
      ...clickInfo.event.extendedProps
    });
  };

  const onSelectRange = (selectionInfo) => {
    if (!projectId) {
      setError('Selecciona un proyecto para habilitar el calendario.');
      return;
    }
    setSuccess('');
    setError('');
    setNewAvailabilityId('');

    const start = selectionInfo.startStr || selectionInfo.dateStr;
    let end = selectionInfo.endStr;
    if (!end && start) {
      const startDate = new Date(start);
      end = new Date(startDate.getTime() + 60 * 60 * 1000).toISOString();
    }
    if (new Date(start).getTime() <= Date.now()) {
      setError('No puedes seleccionar horarios pasados o en curso.');
      return;
    }

    const match = calendar.availability.find((slot) =>
      slot.slot_start === start && slot.slot_end === end && String(slot.project_id) === String(projectId)
    );

    if (match) {
      setActiveEvent({
        kind: 'availability',
        title: `Disponible · ${match.executive_name}`,
        start: match.slot_start,
        end: match.slot_end,
        slotId: match.id,
        executiveId: match.executive_id,
        projectId: match.project_id,
        executiveName: match.executive_name
      });
      return;
    }

    const selectedProject = projects.find((p) => String(p.id) === String(projectId));
    setActiveEvent({
      kind: 'selection',
      title: 'Horario seleccionado',
      start,
      end,
      projectId: Number(projectId),
      executiveId: selectedProject?.manager_id ? Number(selectedProject.manager_id) : null,
      executiveName: selectedProject?.manager_name || null
    });
  };

  const reserveFromCalendar = async (e) => {
    e.preventDefault();
    if (!activeEvent || !['availability', 'selection'].includes(activeEvent.kind)) return;
    setActionLoading(true);
    try {
      if (!activeEvent.executiveId) {
        throw new Error('Este proyecto no tiene ejecutivo asignado para reservar.');
      }
      const body = {
        projectId: Number(activeEvent.projectId),
        executiveId: Number(activeEvent.executiveId),
        slotStart: activeEvent.start,
        slotEnd: activeEvent.end,
        clientName,
        clientEmail,
        clientPhone,
        clientRut
      };
      await api('/api/book', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      setSuccess('Reserva creada correctamente.');
      setClientName(''); setClientEmail(''); setClientPhone(''); setClientRut(''); setBlockReason(''); setActiveEvent(null);
      await loadCalendar();
    } catch (err) { setError(err.message); }
    finally { setActionLoading(false); }
  };

  const rescheduleFromCalendar = async () => {
    if (!activeEvent || !newAvailabilityId) { setError('Selecciona un nuevo horario.'); return; }
    setActionLoading(true);
    try {
      await api('/api/reschedule', { method: 'PUT', body: JSON.stringify({ visitId: Number(activeEvent.visitId), newAvailabilityId: Number(newAvailabilityId) }) });
      setSuccess('Reserva reprogramada.');
      setActiveEvent(null);
      await loadCalendar();
    } catch (err) { setError(err.message); }
    finally { setActionLoading(false); }
  };

  const cancelFromCalendar = async () => {
    if (!activeEvent) return;
    setActionLoading(true);
    try {
      await api('/api/cancel', { method: 'DELETE', body: JSON.stringify({ visitId: Number(activeEvent.visitId) }) });
      setSuccess('Reserva anulada.');
      setActiveEvent(null);
      await loadCalendar();
    } catch (err) { setError(err.message); }
    finally { setActionLoading(false); }
  };

  const blockSelectedSlot = async () => {
    if (!activeEvent || !activeEvent.projectId || !activeEvent.start || !activeEvent.end) return;
    setActionLoading(true);
    try {
      await api('/api/calendar/slot-status', {
        method: 'POST',
        body: JSON.stringify({
          projectId: Number(activeEvent.projectId),
          startsAt: activeEvent.start,
          endsAt: activeEvent.end,
          status: 'blocked',
          observation: blockReason || 'Bloqueo manual por supervisor'
        })
      });
      setSuccess('Horario bloqueado correctamente.');
      setBlockReason('');
      setActiveEvent(null);
      await loadCalendar();
    } catch (err) {
      setError(err.message || 'No se pudo bloquear el horario');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-6 md:mb-8">
        <div>
          <h2 className="text-3xl font-headline font-extrabold text-primary-container tracking-tight">Calendario Maestro</h2>
          <p className="text-on-surface-variant text-sm mt-1 font-body">Disponibilidad y gestion de visitas por proyecto.</p>
        </div>
        <div className="flex items-center bg-surface-container-low p-1 rounded-xl gap-0.5">
          <span className="text-xs text-on-surface-variant font-semibold px-3">Vista:</span>
          <button className="px-4 py-1.5 text-xs font-bold bg-white text-secondary rounded-lg shadow-sm">Semana</button>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-[#e6f4ea] text-[#1e8e3e] rounded-md text-sm font-medium">
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
          {success}
          <button onClick={() => setSuccess('')} className="ml-auto text-[#1e8e3e]/60 hover:text-[#1e8e3e]">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
          </button>
        </div>
      )}
      {error && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-error-container text-on-error-container rounded-md text-sm font-medium">
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
          {error}
          <button onClick={() => setError('')} className="ml-auto text-on-error-container/60 hover:text-on-error-container">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Filters sidebar */}
        <aside className="xl:col-span-4 2xl:col-span-3 space-y-4">
          <div className="bg-surface-container-lowest p-5 rounded-xl shadow-surface space-y-4">
            <h3 className="font-headline font-bold text-sm text-primary-container">Filtros</h3>
            <div>
              <FieldLabel>Proyecto</FieldLabel>
              <select
                value={projectId} onChange={(e) => setProjectId(e.target.value)}
                className="w-full bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
              >
                <option value="">Todos los proyectos</option>
                {projects.map((p) => <option key={p.id} value={p.id}>#{p.id} {p.name}</option>)}
              </select>
              {!projectId && (
                <p className="text-[11px] text-amber-700 mt-1.5">Debes seleccionar un proyecto para habilitar la seleccion de horarios.</p>
              )}
            </div>
            <div>
              <FieldLabel>Desde</FieldLabel>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                className="w-full bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
              />
            </div>
            <div>
              <FieldLabel>Hasta</FieldLabel>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                className="w-full bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
              />
            </div>
            <button
              onClick={loadCalendar} disabled={loading}
              className="w-full flex items-center justify-center gap-2 text-white text-sm font-semibold py-2 rounded-md active:scale-95 transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #000a1e, #002147)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
              {loading ? 'Cargando...' : 'Actualizar'}
            </button>
          </div>

          {/* Legend */}
          <div className="bg-surface-container-lowest p-5 rounded-xl shadow-surface space-y-3">
            <h3 className="font-headline font-bold text-sm text-primary-container">Leyenda</h3>
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-sm bg-[#e6f4ea]" style={{ borderLeft: '3px solid #1e8e3e' }}></span>
              <span className="text-xs font-medium text-on-surface-variant">Disponible</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-sm bg-[#e8f0fe]" style={{ borderLeft: '3px solid #0054cd' }}></span>
              <span className="text-xs font-medium text-on-surface-variant">Visita Confirmada</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-sm bg-[#f1f3f4]" style={{ borderLeft: '3px solid #9aa0a6' }}></span>
              <span className="text-xs font-medium text-on-surface-variant">Bloqueado</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-sm bg-[#fff8e1]" style={{ borderLeft: '3px solid #8d6e00' }}></span>
              <span className="text-xs font-medium text-on-surface-variant">Seleccion manual (reservable)</span>
            </div>
          </div>

          {/* Action panel */}
          <div className="bg-surface-container-lowest p-5 rounded-xl shadow-surface">
            <h3 className="font-headline font-bold text-sm text-primary-container mb-4">
              {activeEvent ? 'Acciones' : 'Panel de Acciones'}
            </h3>
            <ActionPanel
              activeEvent={activeEvent}
              nextSlots={nextSlots}
              newAvailabilityId={newAvailabilityId}
              setNewAvailabilityId={setNewAvailabilityId}
              clientName={clientName}
              setClientName={setClientName}
              clientEmail={clientEmail}
              setClientEmail={setClientEmail}
              clientPhone={clientPhone}
              setClientPhone={setClientPhone}
              clientRut={clientRut}
              setClientRut={setClientRut}
              actionLoading={actionLoading}
              reserveFromCalendar={reserveFromCalendar}
              rescheduleFromCalendar={rescheduleFromCalendar}
              cancelFromCalendar={cancelFromCalendar}
              canBlock={normalizedRole === 'admin'}
              canManageVisits={canManageVisits}
              blockReason={blockReason}
              setBlockReason={setBlockReason}
              blockSelectedSlot={blockSelectedSlot}
            />
          </div>
        </aside>

        {/* Calendar main */}
        <div className="xl:col-span-8 2xl:col-span-9 bg-surface-container-lowest rounded-xl shadow-surface overflow-hidden">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={isNarrow ? 'timeGridDay' : 'timeGridWeek'}
            locale="es"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: isNarrow ? 'timeGridDay,timeGridWeek' : 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día' }}
            allDaySlot={false}
            slotMinTime="10:00:00"
            slotMaxTime="19:00:00"
            scrollTime="10:00:00"
            events={calendarEvents}
            selectable={Boolean(projectId)}
            selectMirror
            longPressDelay={100}
            selectLongPressDelay={100}
            selectMinDistance={0}
            selectAllow={(info) => info.start && info.start.getTime() > Date.now()}
            dateClick={onSelectRange}
            select={onSelectRange}
            eventClick={onSelectEvent}
            expandRows
            stickyHeaderDates
            height="auto"
          />
        </div>
      </div>
    </div>
  );
}
