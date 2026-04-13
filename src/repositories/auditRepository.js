const pool = require('../db/connection');

async function q(sql, params = [], client) {
  return (client || pool).query(sql, params);
}

async function createAuditLog(entry, client) {
  const { rows } = await q(
    `INSERT INTO audit_logs (
      project_id, user_id, action, module, entity_type, entity_id,
      description, old_values, new_values, status, ip_address, user_agent, created_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW()) RETURNING id`,
    [
      entry.projectId || null,
      entry.userId || null,
      entry.action,
      entry.module || null,
      entry.entityType || null,
      entry.entityId || null,
      entry.description || null,
      entry.oldValues ? JSON.stringify(entry.oldValues) : null,
      entry.newValues ? JSON.stringify(entry.newValues) : null,
      entry.status || 'success',
      entry.ipAddress || null,
      entry.userAgent || null
    ],
    client
  );
  return rows[0];
}

async function listProjectAuditLogs(projectId, filters) {
  const params = [projectId];
  const where = ['project_id = $1'];

  if (filters.userId) {
    params.push(filters.userId);
    where.push(`user_id = $${params.length}`);
  }
  if (filters.action) {
    params.push(filters.action);
    where.push(`action = $${params.length}`);
  }
  if (filters.module) {
    params.push(filters.module);
    where.push(`module = $${params.length}`);
  }
  if (filters.from) {
    params.push(filters.from);
    where.push(`created_at >= $${params.length}`);
  }
  if (filters.to) {
    params.push(filters.to);
    where.push(`created_at <= $${params.length}`);
  }

  const limit = Math.min(Number(filters.limit || 100), 200);
  const offset = Math.max(Number(filters.offset || 0), 0);
  params.push(limit);
  params.push(offset);

  const { rows } = await q(
    `SELECT al.*, u.email AS user_email, u.display_name
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.user_id
     WHERE ${where.join(' AND ')}
     ORDER BY al.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows.map((r) => ({
    ...r,
    old_values: r.old_values ? JSON.parse(r.old_values) : null,
    new_values: r.new_values ? JSON.parse(r.new_values) : null
  }));
}

async function listAuditLogs(filters) {
  const params = [];
  const where = ['1 = 1'];

  if (filters.projectId) {
    params.push(filters.projectId);
    where.push(`al.project_id = $${params.length}`);
  }
  if (filters.userId) {
    params.push(filters.userId);
    where.push(`al.user_id = $${params.length}`);
  }
  if (filters.action) {
    params.push(filters.action);
    where.push(`al.action = $${params.length}`);
  }
  if (filters.module) {
    params.push(filters.module);
    where.push(`al.module = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    where.push(`al.status = $${params.length}`);
  }
  if (filters.entityType) {
    params.push(filters.entityType);
    where.push(`al.entity_type = $${params.length}`);
  }
  if (filters.from) {
    params.push(filters.from);
    where.push(`al.created_at >= $${params.length}`);
  }
  if (filters.to) {
    params.push(filters.to);
    where.push(`al.created_at <= $${params.length}`);
  }

  const limit = Math.min(Number(filters.limit || 100), 300);
  const offset = Math.max(Number(filters.offset || 0), 0);
  params.push(limit);
  params.push(offset);

  const { rows } = await q(
    `SELECT al.*, u.email AS user_email, u.display_name
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.user_id
     WHERE ${where.join(' AND ')}
     ORDER BY al.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return rows.map((r) => ({
    ...r,
    old_values: r.old_values ? JSON.parse(r.old_values) : null,
    new_values: r.new_values ? JSON.parse(r.new_values) : null
  }));
}

module.exports = {
  createAuditLog,
  listProjectAuditLogs,
  listAuditLogs
};
