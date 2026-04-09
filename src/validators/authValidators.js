const { AppError } = require('../shared/errors');

function mustString(value, fieldName) {
  if (!value || typeof value !== 'string' || !value.trim()) {
    throw new AppError(`${fieldName} es requerido`, 400, 'VALIDATION_ERROR');
  }
  return value.trim();
}

function validateEmail(value, fieldName = 'email') {
  const email = mustString(value, fieldName).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError(`${fieldName} invalido`, 400, 'VALIDATION_ERROR');
  }
  return email;
}

function validatePassword(value, fieldName = 'password') {
  const password = mustString(value, fieldName);
  if (password.length < 8) {
    throw new AppError(`${fieldName} debe tener al menos 8 caracteres`, 400, 'VALIDATION_ERROR');
  }
  return password;
}

function validateLoginBody(body) {
  return {
    email: validateEmail(body && body.email),
    password: validatePassword(body && body.password)
  };
}

function validateEmailOnlyBody(body) {
  return {
    email: validateEmail(body && body.email)
  };
}

function validateChangePasswordBody(body) {
  return {
    currentPassword: validatePassword(body && body.currentPassword, 'currentPassword'),
    newPassword: validatePassword(body && body.newPassword, 'newPassword')
  };
}

function validateRequestResetBody(body) {
  return {
    email: validateEmail(body && body.email)
  };
}

function validateResetPasswordBody(body) {
  return {
    token: mustString(body && body.token, 'token'),
    newPassword: validatePassword(body && body.newPassword, 'newPassword')
  };
}

function validateRoleChangeBody(body) {
  const role = mustString(body && body.role, 'role').toLowerCase();
  if (!['admin', 'executive'].includes(role)) {
    throw new AppError('role invalido', 400, 'VALIDATION_ERROR');
  }
  return { role };
}

module.exports = {
  validateLoginBody,
  validateEmailOnlyBody,
  validateChangePasswordBody,
  validateRequestResetBody,
  validateResetPasswordBody,
  validateRoleChangeBody
};
