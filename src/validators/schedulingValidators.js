const { toOptionalPositiveInt, toPositiveInt, toOptionalIsoDateTime } = require('../shared/parse');
const { AppError } = require('../shared/errors');

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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

  return {
    name,
    attentionHours,
    executiveName,
    executiveEmail
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

  return {
    name,
    attentionHours,
    executiveName: executiveName || null,
    executiveEmail
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

module.exports = {
  validateCalendarFilters,
  validateAvailabilityFilters,
  validateExecutiveFilters,
  validateCreateProjectBody,
  validateUpdateProjectBody,
  validateBookBody,
  validateRescheduleBody,
  validateCancelBody
};
