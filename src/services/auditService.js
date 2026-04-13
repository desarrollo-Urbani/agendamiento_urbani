const repo = require('../repositories/auditRepository');

const SENSITIVE_FIELDS = new Set(['password', 'passwordHash', 'password_hash', 'token', 'resetToken', 'reset_token']);

function sanitizeObject(value) {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sanitizeObject);

  const out = {};
  Object.entries(value).forEach(([key, val]) => {
    if (SENSITIVE_FIELDS.has(key)) {
      out[key] = '[REDACTED]';
    } else if (val && typeof val === 'object') {
      out[key] = sanitizeObject(val);
    } else {
      out[key] = val;
    }
  });
  return out;
}

async function logAudit(entry) {
  if (!entry || !entry.action) return null;
  return repo.createAuditLog({
    ...entry,
    oldValues: sanitizeObject(entry.oldValues),
    newValues: sanitizeObject(entry.newValues)
  });
}

async function getProjectHistory(projectId, filters) {
  return repo.listProjectAuditLogs(projectId, filters);
}

async function getAuditLogs(filters) {
  return repo.listAuditLogs(filters || {});
}

module.exports = {
  logAudit,
  getProjectHistory,
  getAuditLogs
};
