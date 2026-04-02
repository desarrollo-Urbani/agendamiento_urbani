async function readJson(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : {};
  } catch (_error) {
    body = { raw: text };
  }

  if (!res.ok) {
    const message = body && body.error ? body.error : `Request failed (${res.status})`;
    const error = new Error(message);
    error.status = res.status;
    error.body = body;
    throw error;
  }

  return { status: res.status, body };
}

function setStatus(targetId, message, type = 'info') {
  const node = document.getElementById(targetId);
  if (!node) return;

  node.textContent = message;
  node.className = `status ${type}`;
}

function withButtonLoading(button, loadingText) {
  if (!button) {
    return () => {};
  }

  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = loadingText;

  return () => {
    button.disabled = false;
    button.textContent = originalText;
  };
}

function renderList(targetId, items, mapFn) {
  const ul = document.getElementById(targetId);
  if (!ul) return;
  ul.innerHTML = '';
  items.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = mapFn(item);
    ul.appendChild(li);
  });
}

function toIsoRangeDate(value, endOfDay) {
  if (!value) return '';
  return `${value}${endOfDay ? 'T23:59:59' : 'T00:00:00'}`;
}

let fullCalendarInstance = null;

function toFullCalendarEvents(payload) {
  const availabilityEvents = payload.availability.map((slot) => ({
    id: `slot-${slot.id}`,
    title: `Disponible | ${slot.executive_name}`,
    start: slot.slot_start,
    end: slot.slot_end,
    color: '#1a9b5a'
  }));

  const visitEvents = payload.visits.map((visit) => ({
    id: `visit-${visit.id}`,
    title: `Reserva | ${visit.client_name}`,
    start: visit.starts_at,
    end: visit.ends_at,
    color: '#dc2626'
  }));

  const blockEvents = payload.blocks.map((block) => ({
    id: `block-${block.id}`,
    title: `Bloqueo | ${block.reason || 'No disponible'}`,
    start: block.block_start,
    end: block.block_end,
    color: '#6b7280'
  }));

  return [...availabilityEvents, ...visitEvents, ...blockEvents];
}

function renderFullCalendar(payload) {
  const host = document.getElementById('calendarHost');
  const fallbackGrid = document.getElementById('calendarGrid');
  if (!host || !window.FullCalendar) return false;

  if (fallbackGrid) {
    fallbackGrid.style.display = 'none';
  }

  if (!fullCalendarInstance) {
    fullCalendarInstance = new window.FullCalendar.Calendar(host, {
      initialView: 'timeGridWeek',
      locale: 'es',
      allDaySlot: false,
      hiddenDays: [0],
      slotMinTime: '09:00:00',
      slotMaxTime: '20:00:00',
      height: 'auto',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay'
      },
      buttonText: {
        today: 'Hoy',
        month: 'Mes',
        week: 'Semana',
        day: 'Dia'
      },
      eventTimeFormat: {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      },
      events: []
    });
    fullCalendarInstance.render();
  }

  fullCalendarInstance.removeAllEvents();
  fullCalendarInstance.addEventSource(toFullCalendarEvents(payload));
  return true;
}

function renderCalendar(payload) {
  if (renderFullCalendar(payload)) {
    return;
  }

  const container = document.getElementById('calendarGrid');
  if (!container) return;

  const host = document.getElementById('calendarHost');
  if (host) {
    host.innerHTML = '';
  }

  const fromFilter = document.getElementById('fromFilter');
  const baseDate = fromFilter && fromFilter.value ? new Date(`${fromFilter.value}T00:00:00`) : new Date();
  const day = baseDate.getDay();
  const mondayDiff = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(baseDate);
  weekStart.setDate(baseDate.getDate() + mondayDiff);

  const days = [];
  for (let i = 0; i < 6; i += 1) {
    const current = new Date(weekStart);
    current.setDate(weekStart.getDate() + i);
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    days.push({
      key: `${yyyy}-${mm}-${dd}`,
      label: current.toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit' }).toUpperCase()
    });
  }

  const eventsBySlot = new Map();
  const addEvent = (dateKey, hour, type, text) => {
    const key = `${dateKey}-${hour}`;
    if (!eventsBySlot.has(key)) {
      eventsBySlot.set(key, []);
    }
    eventsBySlot.get(key).push({ type, text });
  };

  payload.availability.forEach((slot) => {
    const dateKey = slot.slot_start.slice(0, 10);
    const hour = Number(slot.slot_start.slice(11, 13));
    addEvent(dateKey, hour, slot.is_booked ? 'booked' : 'available', `${slot.slot_start.slice(11, 16)} ${slot.executive_name}`);
  });

  payload.visits.forEach((visit) => {
    const dateKey = visit.starts_at.slice(0, 10);
    const hour = Number(visit.starts_at.slice(11, 13));
    addEvent(dateKey, hour, visit.status === 'booked' ? 'booked' : 'blocked', `${visit.starts_at.slice(11, 16)} ${visit.client_name}`);
  });

  payload.blocks.forEach((block) => {
    const dateKey = block.block_start.slice(0, 10);
    const hour = Number(block.block_start.slice(11, 13));
    addEvent(dateKey, hour, 'blocked', `${block.block_start.slice(11, 16)} ${block.reason || 'Bloqueo'}`);
  });

  container.innerHTML = '';
  container.className = 'week-calendar';

  const headTime = document.createElement('div');
  headTime.className = 'week-head week-time-head';
  headTime.textContent = 'GMT-03';
  container.appendChild(headTime);

  days.forEach((d) => {
    const head = document.createElement('div');
    head.className = 'week-head';
    head.textContent = d.label;
    container.appendChild(head);
  });

  for (let hour = 9; hour <= 20; hour += 1) {
    const timeCell = document.createElement('div');
    timeCell.className = 'week-time';
    timeCell.textContent = `${String(hour).padStart(2, '0')}:00`;
    container.appendChild(timeCell);

    days.forEach((d) => {
      const slotCell = document.createElement('div');
      slotCell.className = 'week-slot';
      const key = `${d.key}-${hour}`;
      const events = eventsBySlot.get(key) || [];

      events.slice(0, 3).forEach((eventData) => {
        const chip = document.createElement('div');
        chip.className = `week-event ${eventData.type}`;
        chip.textContent = eventData.text;
        slotCell.appendChild(chip);
      });

      if (events.length > 3) {
        const more = document.createElement('div');
        more.className = 'week-more';
        more.textContent = `+${events.length - 3} mas`;
        slotCell.appendChild(more);
      }

      container.appendChild(slotCell);
    });
  }
}

async function loadProjectsIntoUi() {
  const { body } = await readJson('/api/projects');

  if (document.getElementById('projectsList')) {
    renderList(
      'projectsList',
      body,
      (p) => `#${p.id} ${p.name} | ${p.typologies || 'Tipologias por confirmar'} | Entrega: ${p.delivery_date || 'Por confirmar'} | Sala: ${p.sales_office_address || 'Por confirmar'} | Horario: ${p.attention_hours || 'Por confirmar'}`
    );
  }

  const select = document.getElementById('projectFilter');
  if (select) {
    select.innerHTML = '<option value="">Todos los proyectos</option>';
    body.forEach((project) => {
      const option = document.createElement('option');
      option.value = String(project.id);
      option.textContent = `#${project.id} ${project.name}`;
      select.appendChild(option);
    });
  }

  setStatus('globalStatus', `Listo: ${body.length} proyectos cargados.`, 'success');
}

async function loadCalendar() {
  const projectFilter = document.getElementById('projectFilter');
  const fromFilter = document.getElementById('fromFilter');
  const toFilter = document.getElementById('toFilter');
  if (!projectFilter || !fromFilter || !toFilter) return;

  const params = new URLSearchParams();
  if (projectFilter.value) params.set('projectId', projectFilter.value);
  if (fromFilter.value) params.set('from', toIsoRangeDate(fromFilter.value, false));
  if (toFilter.value) params.set('to', toIsoRangeDate(toFilter.value, true));

  const { body } = await readJson(`/api/calendar?${params.toString()}`);
  renderCalendar(body);

  const totalEvents = body.availability.length + body.visits.length + body.blocks.length;
  setStatus('globalStatus', `Calendario actualizado con ${totalEvents} eventos.`, 'success');
}

const loadProjectsBtn = document.getElementById('loadProjects');
if (loadProjectsBtn) {
  loadProjectsBtn.addEventListener('click', async () => {
    const done = withButtonLoading(loadProjectsBtn, 'Cargando...');
    try {
      await loadProjectsIntoUi();
    } catch (error) {
      setStatus('globalStatus', `No se pudieron cargar proyectos: ${error.message}`, 'error');
    } finally {
      done();
    }
  });
}

const loadCalendarBtn = document.getElementById('loadCalendar');
if (loadCalendarBtn) {
  loadCalendarBtn.addEventListener('click', async () => {
    const done = withButtonLoading(loadCalendarBtn, 'Actualizando...');
    try {
      await loadCalendar();
    } catch (error) {
      setStatus('globalStatus', `No se pudo cargar el calendario: ${error.message}`, 'error');
    } finally {
      done();
    }
  });
}

const bookForm = document.getElementById('bookForm');
if (bookForm) {
  bookForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = bookForm.querySelector('button[type="submit"]');
    const done = withButtonLoading(submitButton, 'Reservando...');

    try {
      const form = new FormData(event.target);
      const payload = Object.fromEntries(form.entries());
      payload.projectId = Number(payload.projectId);
      payload.executiveId = Number(payload.executiveId);
      payload.availabilityId = Number(payload.availabilityId);

      const result = await readJson('/api/book', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const output = document.getElementById('bookResult');
      if (output) output.textContent = JSON.stringify(result, null, 2);

      setStatus('bookStatus', `Reserva creada con exito. ID visita: ${result.body.visitId}.`, 'success');
      setStatus('globalStatus', 'Reserva realizada correctamente.', 'success');
    } catch (error) {
      setStatus('bookStatus', `No fue posible reservar: ${error.message}`, 'error');
      setStatus('globalStatus', 'Hubo un error al crear la reserva.', 'error');
    } finally {
      done();
    }
  });
}

const rescheduleForm = document.getElementById('rescheduleForm');
if (rescheduleForm) {
  rescheduleForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = rescheduleForm.querySelector('button[type="submit"]');
    const done = withButtonLoading(submitButton, 'Reprogramando...');

    try {
      const form = new FormData(event.target);
      const payload = Object.fromEntries(form.entries());
      payload.visitId = Number(payload.visitId);
      payload.newAvailabilityId = Number(payload.newAvailabilityId);

      const result = await readJson('/api/reschedule', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      const output = document.getElementById('confirmResult');
      if (output) output.textContent = JSON.stringify(result, null, 2);

      setStatus('confirmStatus', `Visita #${payload.visitId} reprogramada con exito.`, 'success');
      setStatus('globalStatus', 'Reprogramacion confirmada.', 'success');
    } catch (error) {
      setStatus('confirmStatus', `No se pudo reprogramar: ${error.message}`, 'error');
      setStatus('globalStatus', 'Hubo un error al reprogramar.', 'error');
    } finally {
      done();
    }
  });
}

const cancelForm = document.getElementById('cancelForm');
if (cancelForm) {
  cancelForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = cancelForm.querySelector('button[type="submit"]');
    const done = withButtonLoading(submitButton, 'Cancelando...');

    try {
      const form = new FormData(event.target);
      const payload = Object.fromEntries(form.entries());
      payload.visitId = Number(payload.visitId);

      const result = await readJson('/api/cancel', {
        method: 'DELETE',
        body: JSON.stringify(payload)
      });

      const output = document.getElementById('confirmResult');
      if (output) output.textContent = JSON.stringify(result, null, 2);

      setStatus('confirmStatus', `Visita #${payload.visitId} cancelada con exito.`, 'success');
      setStatus('globalStatus', 'Cancelacion realizada correctamente.', 'success');
    } catch (error) {
      setStatus('confirmStatus', `No se pudo cancelar: ${error.message}`, 'error');
      setStatus('globalStatus', 'Hubo un error al cancelar.', 'error');
    } finally {
      done();
    }
  });
}

function ensureStatusElements() {
  const grid = document.querySelector('.grid');
  if (!grid) return;

  if (!document.getElementById('globalStatus')) {
    const banner = document.createElement('p');
    banner.id = 'globalStatus';
    banner.className = 'status info';
    banner.textContent = 'Sistema listo.';
    grid.prepend(banner);
  }

  const bookResult = document.getElementById('bookResult');
  if (bookResult && !document.getElementById('bookStatus')) {
    const status = document.createElement('p');
    status.id = 'bookStatus';
    status.className = 'status info';
    status.textContent = 'Completa el formulario para reservar.';
    bookResult.parentElement.insertBefore(status, bookResult);
  }

  const confirmResult = document.getElementById('confirmResult');
  if (confirmResult && !document.getElementById('confirmStatus')) {
    const status = document.createElement('p');
    status.id = 'confirmStatus';
    status.className = 'status info';
    status.textContent = 'Puedes reprogramar o cancelar una visita aqui.';
    confirmResult.parentElement.insertBefore(status, confirmResult);
  }
}

(async function init() {
  ensureStatusElements();

  if (document.getElementById('projectFilter')) {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const base = `${yyyy}-${mm}-${dd}`;
    document.getElementById('fromFilter').value = base;
    document.getElementById('toFilter').value = base;
    try {
      await loadProjectsIntoUi();
      await loadCalendar();
    } catch (error) {
      setStatus('globalStatus', `No se pudo inicializar la vista: ${error.message}`, 'error');
    }
  }
})();
