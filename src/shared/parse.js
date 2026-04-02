const { AppError } = require('./errors');

function toPositiveInt(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`${fieldName} must be a positive integer`, 400, 'VALIDATION_ERROR');
  }
  return parsed;
}

function toOptionalPositiveInt(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  return toPositiveInt(value, fieldName);
}

function toOptionalIsoDateTime(value, fieldName) {
  if (!value) return undefined;
  if (Number.isNaN(Date.parse(value))) {
    throw new AppError(`${fieldName} must be a valid datetime`, 400, 'VALIDATION_ERROR');
  }
  return value;
}

module.exports = {
  toPositiveInt,
  toOptionalPositiveInt,
  toOptionalIsoDateTime
};
