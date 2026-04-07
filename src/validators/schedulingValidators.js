const { toOptionalPositiveInt, toPositiveInt, toOptionalIsoDateTime } = require('../shared/parse');
const { AppError } = require('../shared/errors');

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidTimeHHmm(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function normalizeScheduleDays(rawValue) {
  if (Array.isArray(rawValue)) {
    return rawValue.map((day) => Number(day));
  }
  if (typeof rawValue === 'string' && rawValue.trim() !== '') {
    return rawValue
      .split(',')
      .map((day) => Number(day.trim()))
      .filter((day) => Number.isInteger(day));
  }
  return [];
}

function normalizeBlockedDates(rawValue) {
  if (Array.isArray(rawValue)) {
    return rawValue.map((value) => String(value).trim()).filter(Boolean);
  }
  if (typeof rawValue === 'string' && rawValue.trim() !== '') {
    return rawValue
      .split(/[,\n]/)
      .map((value) => value.trim())
      .filter(Boolean);
  }
  return [];
}

function buildSchedulePayload(body, isRequired) {
  const scheduleDays = normalizeScheduleDays(body && body.scheduleDays);
  const scheduleStart = body && body.scheduleStart ? String(body.scheduleStart).trim() : '';
  const scheduleEnd = body && body.scheduleEnd ? String(body.scheduleEnd).trim() : '';
  const slotMinutes = Number(body && body.slotMinutes ? body.slotMinutes : 60);
  const blockedDates = normalizeBlockedDates(body && body.blockedDates);

  if (isRequired && scheduleDays.length === 0) {
    throw new AppError('scheduleDays is required', 400, 'VALIDATION_ERROR');
  }

  if (scheduleDays.length > 0) {
    const hasInvalidDay = scheduleDays.some((day) => !Number.isInteger(day) || day < 0 || day > 6);
    if (hasInvalidDay) {
      throw new AppError('scheduleDays must contain values between 0 and 6', 400, 'VALIDATION_ERROR');
    }
  }

  if (scheduleDays.length > 0 || scheduleStart || scheduleEnd) {
    if (!isValidTimeHHmm(scheduleStart)) {
      throw new AppError('scheduleStart must be HH:mm', 400, 'VALIDATION_ERROR');
    }
    if (!isValidTimeHHmm(scheduleEnd)) {
      throw new AppError('scheduleEnd must be HH:mm', 400, 'VALIDATION_ERROR');
    }
    if (scheduleStart >= scheduleEnd) {
      throw new AppError('scheduleStart must be earlier than scheduleEnd', 400, 'VALIDATION_ERROR');
    }
  }

  if (!Number.isInteger(slotMinutes) || slotMinutes <= 0) {
    throw new AppError('slotMinutes must be a positive integer', 400, 'VALIDATION_ERROR');
  }

  const invalidBlocked = blockedDates.find((dateStr) => !/^\d{4}-\d{2}-\d{2}$/.test(dateStr));
  if (invalidBlocked) {
    throw new AppError('blockedDates must use YYYY-MM-DD format', 400, 'VALIDATION_ERROR');
  }

  const uniqueDays = [...new Set(scheduleDays)].sort((a, b) => a - b);
  const scheduleRules = uniqueDays.map((weekday) => ({
    weekday,
    startTime: scheduleStart,
    endTime: scheduleEnd,
    slotMinutes
  }));

  const dayBlocks = [...new Set(blockedDates)].map((blockDate) => ({
    blockDate,
    isFullDay: true,
    reason: 'Dia bloqueado'
  }));

  return {
    scheduleRules,
    dayBlocks
  };
}

function validateCalendarFilters(query) {
  return {
    projectId: toOptionalPositiveInt(query.projectId, 'projectId'),
    from: toOptionalIsoDateTime(query.from, 'from'),
    to: toOptionalIsoDateTime(query.to, 'to')
  };
}

function validateAvailabilityFilters(query) {
  return {
    projectId: toOptionalPositiveInt(query.projectId, 'projectId'),
    executiveId: toOptionalPositiveInt(query.executiveId, 'executiveId')
  };
}

function validateExecutiveFilters(query) {
  return {
    projectId: toOptionalPositiveInt(query.projectId, 'projectId')
  };
}

function validateBookBody(body) {
  if (!body.clientName || String(body.clientName).trim() === '') {
    throw new AppError('clientName is required', 400, 'VALIDATION_ERROR');
  }

  const normalizedEmail = body.clientEmail ? String(body.clientEmail).trim() : null;
  if (normalizedEmail && !isValidEmail(normalizedEmail)) {
    throw new AppError('clientEmail format is invalid', 400, 'VALIDATION_ERROR');
  }

  return {
    projectId: toPositiveInt(body.projectId, 'projectId'),
    executiveId: toPositiveInt(body.executiveId, 'executiveId'),
    availabilityId: toPositiveInt(body.availabilityId, 'availabilityId'),
    clientName: String(body.clientName).trim(),
    clientEmail: normalizedEmail
  };
}

function validateCreateProjectBody(body) {
  const name = body && body.name ? String(body.name).trim() : '';
  const attentionHours = body && body.attentionHours ? String(body.attentionHours).trim() : '';
  const executiveName = body && body.executiveName ? String(body.executiveName).trim() : '';
  const executiveEmail = body && body.executiveEmail ? String(body.executiveEmail).trim() : null;

  if (!name) {
    throw new AppError('name is required', 400, 'VALIDATION_ERROR');
  }
  if (!attentionHours) {
    throw new AppError('attentionHours is required', 400, 'VALIDATION_ERROR');
  }
  if (!executiveName) {
    throw new AppError('executiveName is required', 400, 'VALIDATION_ERROR');
  }
  if (executiveEmail && !isValidEmail(executiveEmail)) {
    throw new AppError('executiveEmail format is invalid', 400, 'VALIDATION_ERROR');
  }

  const schedulePayload = buildSchedulePayload(body, true);

  return {
    name,
    attentionHours,
    executiveName,
    executiveEmail,
    scheduleRules: schedulePayload.scheduleRules,
    dayBlocks: schedulePayload.dayBlocks
  };
}

function validateUpdateProjectBody(body) {
  const name = body && body.name ? String(body.name).trim() : '';
  const attentionHours = body && body.attentionHours ? String(body.attentionHours).trim() : '';
  const executiveName = body && body.executiveName ? String(body.executiveName).trim() : '';
  const executiveEmail = body && body.executiveEmail ? String(body.executiveEmail).trim() : null;

  if (!name) {
    throw new AppError('name is required', 400, 'VALIDATION_ERROR');
  }
  if (!attentionHours) {
    throw new AppError('attentionHours is required', 400, 'VALIDATION_ERROR');
  }
  if (executiveEmail && !isValidEmail(executiveEmail)) {
    throw new AppError('executiveEmail format is invalid', 400, 'VALIDATION_ERROR');
  }

  const hasScheduleFields = body && (
    body.scheduleDays !== undefined ||
    body.scheduleStart !== undefined ||
    body.scheduleEnd !== undefined ||
    body.slotMinutes !== undefined ||
    body.blockedDates !== undefined
  );
  const schedulePayload = hasScheduleFields ? buildSchedulePayload(body, true) : null;

  return {
    name,
    attentionHours,
    executiveName: executiveName || null,
    executiveEmail,
    scheduleRules: schedulePayload ? schedulePayload.scheduleRules : undefined,
    dayBlocks: schedulePayload ? schedulePayload.dayBlocks : undefined
  };
}

function validateRescheduleBody(body) {
  return {
    visitId: toPositiveInt(body.visitId, 'visitId'),
    newAvailabilityId: toPositiveInt(body.newAvailabilityId, 'newAvailabilityId')
  };
}

function validateCancelBody(body) {
  return {
    visitId: toPositiveInt(body.visitId, 'visitId')
  };
}

function validateSlotStatusBody(body) {
  const status = body && body.status ? String(body.status).trim().toLowerCase() : '';
  const allowedStatuses = new Set(['available', 'booked', 'blocked']);

  if (!allowedStatuses.has(status)) {
    throw new AppError('status must be one of: available, booked, blocked', 400, 'VALIDATION_ERROR');
  }

  const startsAt = body && body.startsAt ? String(body.startsAt).trim() : '';
  const endsAt = body && body.endsAt ? String(body.endsAt).trim() : '';
  if (Number.isNaN(Date.parse(startsAt)) || Number.isNaN(Date.parse(endsAt))) {
    throw new AppError('startsAt and endsAt must be valid datetimes', 400, 'VALIDATION_ERROR');
  }
  if (startsAt >= endsAt) {
    throw new AppError('startsAt must be earlier than endsAt', 400, 'VALIDATION_ERROR');
  }

  const clientName = body && body.clientName ? String(body.clientName).trim() : '';
  const clientEmail = body && body.clientEmail ? String(body.clientEmail).trim() : null;
  const unitToVisit = body && body.unitToVisit ? String(body.unitToVisit).trim() : '';
  const observation = body && body.observation ? String(body.observation).trim() : null;

  if (clientEmail && !isValidEmail(clientEmail)) {
    throw new AppError('clientEmail format is invalid', 400, 'VALIDATION_ERROR');
  }

  if (status === 'booked') {
    if (!clientName) {
      throw new AppError('clientName is required for booked status', 400, 'VALIDATION_ERROR');
    }
    if (!unitToVisit) {
      throw new AppError('unitToVisit is required for booked status', 400, 'VALIDATION_ERROR');
    }
  }

  return {
    projectId: toPositiveInt(body.projectId, 'projectId'),
    startsAt,
    endsAt,
    status,
    clientName: clientName || null,
    clientEmail,
    unitToVisit: unitToVisit || null,
    observation
  };
}

module.exports = {
  validateCalendarFilters,
  validateAvailabilityFilters,
  validateExecutiveFilters,
  validateCreateProjectBody,
  validateUpdateProjectBody,
  validateBookBody,
  validateRescheduleBody,
  validateCancelBody,
  validateSlotStatusBody
};
