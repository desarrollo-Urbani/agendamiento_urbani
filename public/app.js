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
let selectedSlotRange = null;

function pad2(value) {
  return String(value).padStart(2, '0');
}

function toLocalIsoDateTime(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}:00`;
}

function addMinutesIso(isoValue, minutes) {
  const date = new Date(isoValue);
  date.setMinutes(date.getMinutes() + minutes);
  return toLocalIsoDateTime(date);
}

function formatSlotRange(startIso, endIso) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const date = `${pad2(start.getDate())}/${pad2(start.getMonth() + 1)}/${start.getFullYear()}`;
  return `${date} ${pad2(start.getHours())}:${pad2(start.getMinutes())} - ${pad2(end.getHours())}:${pad2(end.getMinutes())}`;
}

function isWithinDisplayWindow(startIso, endIso) {
  const start = new Date(startIso);
  const end = new Date(endIso);

  const day = start.getDay();
  if (day === 0) {
    return false;
  }

  const startHour = start.getHours() + (start.getMinutes() / 60);
  const endHour = end.getHours() + (end.getMinutes() / 60);

  return startHour >= 9 && endHour <= 20;
}

function toFullCalendarEvents(payload) {
  const availabilityEvents = payload.availability
    .filter((slot) => isWithinDisplayWindow(slot.slot_start, slot.slot_end))
    .map((slot) => ({
    id: `slot-${slot.id}`,
    title: `Disponible | ${slot.executive_name}`,
    start: slot.slot_start,
    end: slot.slot_end,
    color: '#1a9b5a',
    extendedProps: {
      eventType: 'available',
      slotData: slot
    }
    }));

  const visitEvents = payload.visits
    .filter((visit) => isWithinDisplayWindow(visit.starts_at, visit.ends_at))
    .map((visit) => ({
    id: `visit-${visit.id}`,
    title: `Reserva | ${visit.client_name}`,
    start: visit.starts_at,
    end: visit.ends_at,
    color: '#dc2626',
    extendedProps: {
      eventType: 'booked',
      slotData: visit
    }
    }));

  const blockEvents = payload.blocks
    .filter((block) => isWithinDisplayWindow(block.block_start, block.block_end))
    .map((block) => ({
    id: `block-${block.id}`,
    title: `Bloqueo | ${block.reason || 'No disponible'}`,
    start: block.block_start,
    end: block.block_end,
    color: '#6b7280',
    extendedProps: {
      eventType: 'blocked',
      slotData: block
    }
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
      slotMaxTime: '21:00:00',
      scrollTime: '09:00:00',
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
      dateClick: (info) => {
        if (info.allDay) return;
        const startIso = toLocalIsoDateTime(info.date);
        const endIso = addMinutesIso(startIso, 60);
        openSlotEditor({
          startIso,
          endIso,
          status: 'available'
        });
      },
      eventClick: (info) => {
        const eventType = info.event.extendedProps.eventType || 'available';
        const data = info.event.extendedProps.slotData || {};
        openSlotEditor({
          startIso: toLocalIsoDateTime(info.event.start),
          endIso: toLocalIsoDateTime(info.event.end),
          status: eventType,
          clientName: data.client_name || '',
          clientEmail: data.client_email || '',
          unitToVisit: data.unit_to_visit || '',
          observation: data.observation || data.reason || ''
        });
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
    if (!isWithinDisplayWindow(slot.slot_start, slot.slot_end)) return;
    const dateKey = slot.slot_start.slice(0, 10);
    const hour = Number(slot.slot_start.slice(11, 13));
    addEvent(dateKey, hour, slot.is_booked ? 'booked' : 'available', `${slot.slot_start.slice(11, 16)} ${slot.executive_name}`);
  });

  payload.visits.forEach((visit) => {
    if (!isWithinDisplayWindow(visit.starts_at, visit.ends_at)) return;
    const dateKey = visit.starts_at.slice(0, 10);
    const hour = Number(visit.starts_at.slice(11, 13));
    addEvent(dateKey, hour, visit.status === 'booked' ? 'booked' : 'blocked', `${visit.starts_at.slice(11, 16)} ${visit.client_name}`);
  });

  payload.blocks.forEach((block) => {
    if (!isWithinDisplayWindow(block.block_start, block.block_end)) return;
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
      const slotStartIso = `${d.key}T${String(hour).padStart(2, '0')}:00:00`;
      const slotEndHour = Math.min(hour + 1, 20);
      const slotEndIso = `${d.key}T${String(slotEndHour).padStart(2, '0')}:00:00`;

      slotCell.addEventListener('click', () => {
        container.querySelectorAll('.week-slot.selected').forEach((node) => node.classList.remove('selected'));
        slotCell.classList.add('selected');

        const firstEvent = events[0] || null;
        openSlotEditor({
          startIso: slotStartIso,
          endIso: slotEndIso,
          status: firstEvent ? firstEvent.type : 'available'
        });
      });

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
      (p) => {
        const blockedDaysCount = Array.isArray(p.day_blocks) ? p.day_blocks.length : 0;
        return `#${p.id} ${p.name} | Encargado: ${p.manager_name || 'Por confirmar'} | Horario: ${p.attention_hours || 'Por confirmar'} | Dias bloqueados: ${blockedDaysCount}`;
      }
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

    if (!select.value && body.length > 0) {
      select.value = String(body[0].id);
    }
  }

  setStatus('globalStatus', `Listo: ${body.length} proyectos cargados.`, 'success');
}

const weekdayNames = {
  0: 'Dom',
  1: 'Lun',
  2: 'Mar',
  3: 'Mie',
  4: 'Jue',
  5: 'Vie',
  6: 'Sab'
};

function buildAttentionHoursSummary(form) {
  const selectedDays = Array.from(form.querySelectorAll('input[name="scheduleDays"]:checked'))
    .map((node) => Number(node.value))
    .sort((a, b) => a - b)
    .map((day) => weekdayNames[day]);

  const start = form.querySelector('#scheduleStart')?.value || '';
  const end = form.querySelector('#scheduleEnd')?.value || '';
  if (!selectedDays.length || !start || !end) {
    return '';
  }
  return `${selectedDays.join('-')} ${start}-${end}`;
}

function syncAttentionHoursInput(form) {
  const target = form.querySelector('#newProjectHours');
  if (!target) return;
  target.value = buildAttentionHoursSummary(form);
}

function buildFallbackSelectableSlots() {
  const fromValue = document.getElementById('fromFilter')?.value;
  const toValue = document.getElementById('toFilter')?.value;
  const startDate = fromValue ? new Date(`${fromValue}T00:00:00`) : new Date();
  const endDate = toValue ? new Date(`${toValue}T00:00:00`) : new Date(startDate);
  const slots = [];

  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    if (cursor.getDay() !== 0) {
      const dateKey = `${cursor.getFullYear()}-${pad2(cursor.getMonth() + 1)}-${pad2(cursor.getDate())}`;
      for (let hour = 9; hour < 20; hour += 1) {
        slots.push({
          startIso: `${dateKey}T${pad2(hour)}:00:00`,
          endIso: `${dateKey}T${pad2(hour + 1)}:00:00`,
          status: 'available',
          data: null
        });
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return slots;
}

function renderSlotPanel(payload) {
  const panel = document.getElementById('slotPanel');
  if (!panel) return;

  const availableSlots = payload.availability
    .filter((slot) => isWithinDisplayWindow(slot.slot_start, slot.slot_end))
    .map((slot) => ({
      startIso: slot.slot_start,
      endIso: slot.slot_end,
      status: 'available',
      data: slot
    }))
    .sort((a, b) => a.startIso.localeCompare(b.startIso));

  const slotsToRender = availableSlots.length > 0 ? availableSlots : buildFallbackSelectableSlots();

  if (slotsToRender.length === 0) {
    panel.innerHTML = '<p class="slot-panel-empty">Sin horarios para el rango seleccionado.</p>';
    return;
  }

  panel.innerHTML = '';

  const byDate = new Map();
  slotsToRender.forEach((slot) => {
    const dateKey = slot.startIso.slice(0, 10);
    if (!byDate.has(dateKey)) byDate.set(dateKey, []);
    byDate.get(dateKey).push(slot);
  });

  byDate.forEach((slots, dateKey) => {
    const d = new Date(`${dateKey}T00:00:00`);
    const dayLabel = d.toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: '2-digit' }).toUpperCase();

    const group = document.createElement('div');
    group.className = 'slot-panel-group';

    const heading = document.createElement('span');
    heading.className = 'slot-panel-date';
    heading.textContent = dayLabel;
    group.appendChild(heading);

    slots.forEach((slot) => {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = `slot-pill ${slot.status}`;
      const startH = slot.startIso.slice(11, 16);
      const endH = slot.endIso.slice(11, 16);
      pill.textContent = `${startH} - ${endH}`;
      pill.dataset.start = slot.startIso;
      pill.dataset.end = slot.endIso;
      pill.dataset.status = slot.status;

      pill.addEventListener('click', () => {
        panel.querySelectorAll('.slot-pill.selected').forEach((p) => p.classList.remove('selected'));
        pill.classList.add('selected');

        const d2 = slot.data || {};
        openSlotEditor({
          startIso: slot.startIso,
          endIso: slot.endIso,
          status: slot.status,
          clientName: d2.client_name || '',
          clientEmail: d2.client_email || '',
          unitToVisit: d2.unit_to_visit || '',
          observation: d2.observation || d2.reason || ''
        });
      });

      group.appendChild(pill);
    });

    panel.appendChild(group);
  });
}

function syncSlotClientFields() {
  const statusNode = document.getElementById('slotStatus');
  const clientFields = document.getElementById('slotClientFields');
  const clientName = document.getElementById('slotClientName');
  const unitToVisit = document.getElementById('slotUnitToVisit');

  if (!statusNode || !clientFields || !clientName || !unitToVisit) return;

  const isBooked = statusNode.value === 'booked';
  clientFields.style.display = isBooked ? 'block' : 'none';
  clientName.required = isBooked;
  unitToVisit.required = isBooked;
}

function openSlotEditor({ startIso, endIso, status, clientName = '', clientEmail = '', unitToVisit = '', observation = '' }) {
  const projectFilter = document.getElementById('projectFilter');
  const statusNode = document.getElementById('slotStatus');
  const dateTimeNode = document.getElementById('slotDateTime');

  if (!projectFilter || !statusNode || !dateTimeNode) return;

  if (!projectFilter.value) {
    setStatus('slotEditorStatus', 'Primero selecciona un proyecto en el filtro.', 'error');
    return;
  }

  selectedSlotRange = { startIso, endIso };
  dateTimeNode.value = formatSlotRange(startIso, endIso);
  statusNode.value = ['available', 'booked', 'blocked'].includes(status) ? status : 'available';
  document.getElementById('slotClientName').value = clientName;
  document.getElementById('slotClientEmail').value = clientEmail;
  document.getElementById('slotUnitToVisit').value = unitToVisit;
  document.getElementById('slotObservation').value = observation;

  syncSlotClientFields();
  setStatus('slotEditorStatus', 'Edita los datos y guarda el nuevo estado.', 'info');
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
  renderSlotPanel(body);

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

const newProjectForm = document.getElementById('newProjectForm');
if (newProjectForm) {
  newProjectForm.querySelectorAll('input[name="scheduleDays"], #scheduleStart, #scheduleEnd').forEach((node) => {
    node.addEventListener('change', () => syncAttentionHoursInput(newProjectForm));
  });
  syncAttentionHoursInput(newProjectForm);

  newProjectForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitBtn = newProjectForm.querySelector('button[type="submit"]');
    const done = withButtonLoading(submitBtn, 'Guardando...');
    try {
      const form = new FormData(newProjectForm);
      const payload = {};
      form.forEach((value, key) => {
        if (key === 'scheduleDays') return;
        const normalized = String(value).trim();
        if (normalized !== '') payload[key] = normalized;
      });

      payload.scheduleDays = form.getAll('scheduleDays').map((value) => Number(value));
      payload.blockedDates = (payload.blockedDates || '')
        .split(/[,\n]/)
        .map((value) => value.trim())
        .filter(Boolean);
      payload.slotMinutes = Number(payload.slotMinutes || 60);
      payload.attentionHours = buildAttentionHoursSummary(newProjectForm);

      await readJson('/api/projects', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setStatus('newProjectStatus', 'Proyecto agregado correctamente.', 'success');
      newProjectForm.reset();
      newProjectForm.querySelector('#scheduleStart').value = '09:00';
      newProjectForm.querySelector('#scheduleEnd').value = '20:00';
      newProjectForm.querySelector('#slotMinutes').value = '60';
      newProjectForm.querySelectorAll('input[name="scheduleDays"]').forEach((node) => {
        node.checked = node.value !== '0';
      });
      syncAttentionHoursInput(newProjectForm);
      await loadProjectsIntoUi();
    } catch (error) {
      setStatus('newProjectStatus', `Error: ${error.message}`, 'error');
    } finally {
      done();
    }
  });
}

const slotStatusNode = document.getElementById('slotStatus');
if (slotStatusNode) {
  slotStatusNode.addEventListener('change', () => syncSlotClientFields());
  syncSlotClientFields();
}

const slotEditorForm = document.getElementById('slotEditorForm');
if (slotEditorForm) {
  slotEditorForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const projectFilter = document.getElementById('projectFilter');
    if (!projectFilter || !projectFilter.value) {
      setStatus('slotEditorStatus', 'Debes seleccionar un proyecto.', 'error');
      return;
    }

    if (!selectedSlotRange) {
      setStatus('slotEditorStatus', 'Primero selecciona un horario en el calendario.', 'error');
      return;
    }

    const submitBtn = document.getElementById('saveSlotBtn');
    const done = withButtonLoading(submitBtn, 'Guardando...');
    try {
      const form = new FormData(slotEditorForm);
      const payload = {
        projectId: Number(projectFilter.value),
        startsAt: selectedSlotRange.startIso,
        endsAt: selectedSlotRange.endIso,
        status: String(form.get('status') || '').trim(),
        clientName: String(form.get('clientName') || '').trim(),
        clientEmail: String(form.get('clientEmail') || '').trim(),
        unitToVisit: String(form.get('unitToVisit') || '').trim(),
        observation: String(form.get('observation') || '').trim()
      };

      await readJson('/api/calendar/slot-status', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setStatus('slotEditorStatus', 'Estado del horario actualizado correctamente.', 'success');
      await loadCalendar();
    } catch (error) {
      setStatus('slotEditorStatus', `No se pudo guardar: ${error.message}`, 'error');
    } finally {
      done();
    }
  });
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

  if (document.getElementById('newProjectForm')) {
    try {
      await loadProjectsIntoUi();
    } catch (error) {
      setStatus('newProjectStatus', `No se pudieron cargar proyectos: ${error.message}`, 'error');
    }
  }
})();
