const repo = require('../repositories/schedulingRepository');
const authRepo = require('../repositories/authRepository');
const { AppError } = require('../shared/errors');

function isoDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseMinutes(timeHHmm) {
  const [hh, mm] = String(timeHHmm).split(':').map(Number);
  return (hh * 60) + mm;
}

function toIsoDateTime(dateStr, timeHHmm) {
  return `${dateStr}T${timeHHmm}:00`;
}

function toDateWithOffset(daysFromToday) {
  const base = new Date();
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, 0, 0);
  d.setDate(d.getDate() + daysFromToday);
  return d;
}

function nowIso() {
  return new Date().toISOString();
}

function assertFutureSlot(startsAt, errorMessage) {
  if (!startsAt) return;
  if (new Date(startsAt).getTime() <= Date.now()) {
    throw new AppError(errorMessage || 'No se permiten horarios pasados o en curso', 400, 'VALIDATION_ERROR');
  }
}

function buildDynamicAvailability({ projectId, executive, scheduleRules, dayBlocks, visits, blocks, from, to }) {
  const rulesByWeekday = new Map();
  scheduleRules.forEach((rule) => {
    if (!rulesByWeekday.has(rule.weekday)) {
      rulesByWeekday.set(rule.weekday, []);
    }
    rulesByWeekday.get(rule.weekday).push(rule);
  });

  const dayBlocksByDate = new Map();
  dayBlocks.forEach((block) => {
    if (!dayBlocksByDate.has(block.block_date)) {
      dayBlocksByDate.set(block.block_date, []);
    }
    dayBlocksByDate.get(block.block_date).push(block);
  });

  const occupiedIntervals = [];
  visits.forEach((visit) => occupiedIntervals.push({ start: visit.starts_at, end: visit.ends_at }));
  blocks.forEach((block) => occupiedIntervals.push({ start: block.block_start, end: block.block_end }));

  const hasCollision = (slotStartIso, slotEndIso, blockList) => {
    if (blockList && blockList.length > 0) {
      const slotStart = parseMinutes(slotStartIso.slice(11, 16));
      const slotEnd = parseMinutes(slotEndIso.slice(11, 16));
      const isSameDate = slotStartIso.slice(0, 10);

      const blocked = blockList.some((block) => {
        if (block.is_full_day) return true;
        const blockStartIso = toIsoDateTime(isSameDate, block.start_time || '00:00');
        const blockEndIso = toIsoDateTime(isSameDate, block.end_time || '23:59');
        const bStart = parseMinutes(blockStartIso.slice(11, 16));
        const bEnd = parseMinutes(blockEndIso.slice(11, 16));
        return slotStart < bEnd && slotEnd > bStart;
      });
      if (blocked) return true;
    }

    return occupiedIntervals.some((interval) => slotStartIso < interval.end && slotEndIso > interval.start);
  };

  const availability = [];
  const cursor = new Date(`${from.slice(0, 10)}T00:00:00`);
  const end = new Date(`${to.slice(0, 10)}T00:00:00`);

  while (cursor <= end) {
    const weekday = cursor.getDay();
    const dateStr = isoDate(cursor);
    const rules = rulesByWeekday.get(weekday) || [];
    const blocksInDate = dayBlocksByDate.get(dateStr) || [];

    rules.forEach((rule) => {
      const slotMinutes = Number(rule.slot_minutes) || 60;
      let start = parseMinutes(rule.start_time);
      const endMinutes = parseMinutes(rule.end_time);

      while ((start + slotMinutes) <= endMinutes) {
        const slotStartHHmm = `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`;
        const slotEndMin = start + slotMinutes;
        const slotEndHHmm = `${String(Math.floor(slotEndMin / 60)).padStart(2, '0')}:${String(slotEndMin % 60).padStart(2, '0')}`;

        const slotStartIso = toIsoDateTime(dateStr, slotStartHHmm);
        const slotEndIso = toIsoDateTime(dateStr, slotEndHHmm);

        if (slotStartIso >= from && slotEndIso <= to && !hasCollision(slotStartIso, slotEndIso, blocksInDate)) {
          if (new Date(slotStartIso).getTime() <= Date.now()) {
            start += slotMinutes;
            continue;
          }
          availability.push({
            id: `dyn-${projectId}-${executive.id}-${slotStartIso}`,
            executive_id: executive.id,
            executive_name: executive.name,
            project_id: projectId,
            slot_start: slotStartIso,
            slot_end: slotEndIso,
            is_booked: 0
          });
        }

        start += slotMinutes;
      }
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return availability;
}

async function getProjects() {
  const projects = await repo.listProjects();
  const results = await Promise.all(projects.map(async (project) => ({
    ...project,
    schedule_rules: await repo.listProjectScheduleRules(project.id),
    day_blocks: await repo.listProjectDayBlocks(project.id)
  })));
  return results;
}

async function createProject(input) {
  return repo.inTransaction(async (client) => {
    const projectRow = await repo.createProject({ name: input.name, attentionHours: input.attentionHours }, client);
    const projectId = projectRow.id;

    const executive = await repo.createExecutive({ projectId, name: input.executiveName, email: input.executiveEmail }, client);
    if (input.executiveEmail) {
      await authRepo.createUserIfMissing({ executiveId: executive.id, email: input.executiveEmail, displayName: input.executiveName }, client);
    }

    await repo.replaceProjectScheduleRules(projectId, input.scheduleRules, client);
    await repo.replaceProjectDayBlocks(projectId, input.dayBlocks, client);

    return { projectId };
  });
}

async function updateProject(projectId, input) {
  const existingProject = await repo.findProjectById(projectId);
  if (!existingProject || existingProject.deleted_at) {
    throw new AppError('Project not found', 404, 'NOT_FOUND');
  }

  return repo.inTransaction(async (client) => {
    await repo.updateProject({ projectId, name: input.name, attentionHours: input.attentionHours }, client);

    if (input.scheduleRules) {
      await repo.replaceProjectScheduleRules(projectId, input.scheduleRules, client);
    }
    if (input.dayBlocks) {
      await repo.replaceProjectDayBlocks(projectId, input.dayBlocks, client);
    }

    if (input.executiveName) {
      const currentExecutive = await repo.findPrimaryExecutiveByProjectId(projectId, client);
      if (currentExecutive) {
        await repo.updateExecutive({ executiveId: currentExecutive.id, name: input.executiveName, email: input.executiveEmail }, client);
        if (input.executiveEmail) {
          await authRepo.createUserIfMissing({ executiveId: currentExecutive.id, email: input.executiveEmail, displayName: input.executiveName }, client);
        }
      } else {
        const executive = await repo.createExecutive({ projectId, name: input.executiveName, email: input.executiveEmail }, client);
        if (input.executiveEmail) {
          await authRepo.createUserIfMissing({ executiveId: executive.id, email: input.executiveEmail, displayName: input.executiveName }, client);
        }
      }
    }

    return { success: true };
  });
}

async function changeProjectStatus(projectId, input) {
  const existingProject = await repo.findProjectById(projectId);
  if (!existingProject || existingProject.deleted_at) {
    throw new AppError('Project not found', 404, 'NOT_FOUND');
  }

  return repo.inTransaction(async (client) => {
    await repo.updateProjectStatus(projectId, input.status, client);
    return { success: true };
  });
}

async function deleteProject(projectId) {
  const existingProject = await repo.findProjectById(projectId);
  if (!existingProject || existingProject.deleted_at) {
    throw new AppError('Project not found', 404, 'NOT_FOUND');
  }

  return repo.inTransaction(async (client) => {
    await repo.softDeleteProject(projectId, client);
    return { success: true };
  });
}

async function getExecutives(filters) { return repo.listExecutives(filters); }
async function getAvailability(filters) { return repo.listAvailability(filters); }
async function getVisits(filters) { return repo.listVisits(filters); }
async function getBlocks(filters) { return repo.listBlocks(filters); }

async function getCalendar(filters) {
  const staticCalendar = await repo.listCalendar(filters);
  const now = nowIso();
  staticCalendar.availability = (staticCalendar.availability || []).filter((slot) => slot.slot_start > now);
  if (!filters.projectId) return staticCalendar;

  const project = await repo.findProjectById(filters.projectId);
  if (!project || project.deleted_at) {
    throw new AppError('Project not found', 404, 'NOT_FOUND');
  }

  const scheduleRules = await repo.listProjectScheduleRules(filters.projectId);
  if (scheduleRules.length === 0) return staticCalendar;

  const executive = await repo.findPrimaryExecutiveByProjectId(filters.projectId);
  if (!executive) return staticCalendar;

  const effectiveFrom = filters.from || `${isoDate(toDateWithOffset(0))}T00:00:00`;
  const effectiveTo = filters.to || `${isoDate(toDateWithOffset(30))}T23:59:59`;
  const dayBlocks = await repo.listProjectDayBlocksInRange({ projectId: filters.projectId, from: effectiveFrom, to: effectiveTo });

  const dynamicAvailability = buildDynamicAvailability({
    projectId: filters.projectId,
    executive,
    scheduleRules,
    dayBlocks,
    visits: staticCalendar.visits,
    blocks: staticCalendar.blocks,
    from: effectiveFrom,
    to: effectiveTo
  });

  const dayBlockEvents = dayBlocks.map((block) => {
    const startTime = block.is_full_day ? '00:00' : (block.start_time || '00:00');
    const endTime = block.is_full_day ? '23:59' : (block.end_time || '23:59');
    return {
      id: `day-block-${block.id}`,
      executive_id: executive.id,
      executive_name: executive.name,
      project_id: filters.projectId,
      reason: block.reason || 'Bloqueo manual',
      block_start: toIsoDateTime(block.block_date, startTime),
      block_end: toIsoDateTime(block.block_date, endTime)
    };
  });

  return {
    availability: dynamicAvailability,
    visits: staticCalendar.visits,
    blocks: [...staticCalendar.blocks, ...dayBlockEvents]
  };
}

async function bookVisit(input) {
  const project = await repo.findProjectById(input.projectId);
  if (!project || project.deleted_at) throw new AppError('Project not found', 404, 'NOT_FOUND');

  const executive = await repo.findExecutiveById(input.executiveId);
  if (!executive) throw new AppError('Executive not found', 404, 'NOT_FOUND');
  if (executive.project_id !== input.projectId) throw new AppError('Executive does not belong to project', 400, 'VALIDATION_ERROR');

  assertFutureSlot(input.slotStart, 'No puedes reservar horarios pasados o en curso');

  if (!input.availabilityId && input.slotStart && input.slotEnd) {
    return repo.inTransaction(async (client) => {
      const conflict = await repo.findConflictForSlot({ executiveId: input.executiveId, startsAt: input.slotStart, endsAt: input.slotEnd }, client);
      if (conflict) throw new AppError('Slot is already booked or blocked', 409, 'CONFLICT');
      const newAvail = await repo.createAvailability({ executiveId: input.executiveId, slotStart: input.slotStart, slotEnd: input.slotEnd, isBooked: 1 }, client);
      const visitRow = await repo.createVisit({
        projectId: input.projectId,
        executiveId: input.executiveId,
        availabilityId: newAvail.id,
        clientName: input.clientName,
        clientEmail: input.clientEmail,
        clientPhone: input.clientPhone,
        clientRut: input.clientRut,
        unitToVisit: null,
        observation: null,
        startsAt: input.slotStart,
        endsAt: input.slotEnd,
        status: 'booked'
      }, client);
      return { visitId: visitRow.id };
    });
  }

  const slot = await repo.findOpenAvailability(input.availabilityId, input.executiveId);
  if (!slot) throw new AppError('Availability not found or already booked', 404, 'NOT_FOUND');
  assertFutureSlot(slot.slot_start, 'No puedes reservar horarios pasados o en curso');

  return repo.inTransaction(async (client) => {
    const visitRow = await repo.createVisit({
      projectId: input.projectId,
      executiveId: input.executiveId,
      availabilityId: input.availabilityId,
      clientName: input.clientName,
      clientEmail: input.clientEmail,
      clientPhone: input.clientPhone,
      clientRut: input.clientRut,
      unitToVisit: null,
      observation: null,
      startsAt: slot.slot_start,
      endsAt: slot.slot_end,
      status: 'booked'
    }, client);

    await repo.markAvailabilityBooked(input.availabilityId, client);
    return { visitId: visitRow.id };
  });
}

async function rescheduleVisit(input) {
  const visit = await repo.findBookedVisit(input.visitId);
  if (!visit) throw new AppError('Active visit not found', 404, 'NOT_FOUND');

  const newSlot = await repo.findOpenAvailability(input.newAvailabilityId, visit.executive_id);
  if (!newSlot) throw new AppError('New availability not found or already booked', 404, 'NOT_FOUND');
  assertFutureSlot(newSlot.slot_start, 'No puedes reprogramar a un horario pasado o en curso');

  return repo.inTransaction(async (client) => {
    await repo.markAvailabilityFree(visit.availability_id, client);
    await repo.markAvailabilityBooked(input.newAvailabilityId, client);
    await repo.updateVisitSchedule({ visitId: input.visitId, availabilityId: input.newAvailabilityId, startsAt: newSlot.slot_start, endsAt: newSlot.slot_end }, client);
    return { success: true };
  });
}

async function cancelVisit(input) {
  const visit = await repo.findBookedVisit(input.visitId);
  if (!visit) throw new AppError('Active visit not found', 404, 'NOT_FOUND');

  return repo.inTransaction(async (client) => {
    await repo.cancelVisit(input.visitId, client);
    await repo.markAvailabilityFree(visit.availability_id, client);
    return { success: true };
  });
}

async function setSlotStatus(input) {
  const project = await repo.findProjectById(input.projectId);
  if (!project || project.deleted_at) throw new AppError('Project not found', 404, 'NOT_FOUND');

  assertFutureSlot(input.startsAt, 'No puedes bloquear/desbloquear horarios pasados o en curso');

  const executive = await repo.findPrimaryExecutiveByProjectId(input.projectId);
  if (!executive) throw new AppError('No executive assigned to project', 400, 'VALIDATION_ERROR');

  const visitInSlot = await repo.findActiveVisitBySlot({ projectId: input.projectId, executiveId: executive.id, startsAt: input.startsAt, endsAt: input.endsAt });
  const blockInSlot = await repo.findBlockBySlot({ executiveId: executive.id, blockStart: input.startsAt, blockEnd: input.endsAt });

  return repo.inTransaction(async (client) => {
    if (visitInSlot && input.status !== 'booked') {
      await repo.cancelVisit(visitInSlot.id, client);
      if (visitInSlot.availability_id) await repo.markAvailabilityFree(visitInSlot.availability_id, client);
    }

    if (blockInSlot && input.status !== 'blocked') {
      await repo.deleteBlock(blockInSlot.id, client);
    }

    if (input.status === 'booked') {
      if (blockInSlot) await repo.deleteBlock(blockInSlot.id, client);

      if (visitInSlot) {
        await repo.updateVisitDetails({
          visitId: visitInSlot.id,
          clientName: input.clientName,
          clientEmail: input.clientEmail,
          clientPhone: input.clientPhone,
          clientRut: input.clientRut,
          unitToVisit: input.unitToVisit,
          observation: input.observation,
          status: 'booked'
        }, client);
      } else {
        await repo.createVisit({
          projectId: input.projectId,
          executiveId: executive.id,
          availabilityId: null,
          clientName: input.clientName,
          clientEmail: input.clientEmail,
          clientPhone: input.clientPhone,
          clientRut: input.clientRut,
          unitToVisit: input.unitToVisit,
          observation: input.observation,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          status: 'booked'
        }, client);
      }
    }

    if (input.status === 'blocked') {
      if (visitInSlot) {
        await repo.cancelVisit(visitInSlot.id, client);
        if (visitInSlot.availability_id) await repo.markAvailabilityFree(visitInSlot.availability_id, client);
      }
      if (blockInSlot) await repo.deleteBlock(blockInSlot.id, client);

      await repo.createBlock({
        executiveId: executive.id,
        reason: input.observation || 'Bloqueado manual',
        blockStart: input.startsAt,
        blockEnd: input.endsAt
      }, client);
    }

    return { success: true, status: input.status };
  });
}

async function getMyTodayVisitsSummary(currentUser) {
  if (!currentUser || !currentUser.executiveId) {
    return { totalToday: 0, date: isoDate(new Date()), projectId: currentUser ? currentUser.projectId || null : null };
  }
  const today = isoDate(new Date());
  const from = `${today}T00:00:00`;
  const to = `${today}T23:59:59`;
  const totalToday = await repo.countBookedVisitsForExecutiveByRange({
    executiveId: Number(currentUser.executiveId),
    projectId: currentUser.projectId ? Number(currentUser.projectId) : null,
    from,
    to
  });
  return {
    totalToday,
    date: today,
    projectId: currentUser.projectId || null
  };
}

async function canUserManageVisit(visitId, userId) {
  if (!visitId || !userId) return false;
  return repo.wasVisitCreatedByUser(Number(visitId), Number(userId));
}

module.exports = {
  getProjects,
  createProject,
  updateProject,
  changeProjectStatus,
  deleteProject,
  getExecutives,
  getAvailability,
  getVisits,
  getBlocks,
  getCalendar,
  bookVisit,
  rescheduleVisit,
  cancelVisit,
  setSlotStatus,
  getMyTodayVisitsSummary,
  canUserManageVisit
};
