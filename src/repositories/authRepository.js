const pool = require('../db/connection');

async function q(sql, params = [], client) {
  return (client || pool).query(sql, params);
}

async function findUserByEmail(email) {
  const { rows } = await q(
    `SELECT u.*, e.project_id, e.name AS executive_name
     FROM users u
     LEFT JOIN executives e ON e.id = u.executive_id
     WHERE lower(u.email) = lower($1) AND u.is_active = 1
     LIMIT 1`,
    [email]
  );
  return rows[0] || null;
}

async function findAnyUserByEmail(email) {
  const { rows } = await q(
    `SELECT u.*, e.project_id, e.name AS executive_name
     FROM users u
     LEFT JOIN executives e ON e.id = u.executive_id
     WHERE lower(u.email) = lower($1)
     LIMIT 1`,
    [email]
  );
  return rows[0] || null;
}

async function findUserById(userId) {
  const { rows } = await q(
    `SELECT u.*, e.project_id, e.name AS executive_name
     FROM users u
     LEFT JOIN executives e ON e.id = u.executive_id
     WHERE u.id = $1 AND u.is_active = 1
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function createSession({ userId, token, expiresAt, ipAddress, userAgent }, client) {
  const { rows } = await q(
    `INSERT INTO user_sessions (user_id, session_token, expires_at, ip_address, user_agent)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id`,
    [userId, token, expiresAt, ipAddress || null, userAgent || null],
    client
  );
  return rows[0];
}

async function findSession(token) {
  const { rows } = await q(
    `SELECT s.*, u.email, u.display_name, u.role, u.executive_id
     FROM user_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.session_token = $1 AND s.revoked_at IS NULL AND s.expires_at > NOW()
     LIMIT 1`,
    [token]
  );
  return rows[0] || null;
}

async function revokeSession(token, client) {
  await q(`UPDATE user_sessions SET revoked_at = NOW() WHERE session_token = $1 AND revoked_at IS NULL`, [token], client);
}

async function revokeAllUserSessions(userId, client) {
  await q(`UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`, [userId], client);
}

async function updatePasswordHash(userId, passwordHash, client) {
  await q(`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [passwordHash, userId], client);
}

async function createPasswordResetToken({ userId, token, expiresAt, ipAddress, userAgent }, client) {
  const { rows } = await q(
    `INSERT INTO password_reset_tokens (user_id, reset_token, expires_at, ip_address, user_agent)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id`,
    [userId, token, expiresAt, ipAddress || null, userAgent || null],
    client
  );
  return rows[0];
}

async function findPasswordResetToken(token) {
  const { rows } = await q(
    `SELECT prt.*, u.email
     FROM password_reset_tokens prt
     JOIN users u ON u.id = prt.user_id
     WHERE prt.reset_token = $1 AND prt.used_at IS NULL AND prt.expires_at > NOW()
     LIMIT 1`,
    [token]
  );
  return rows[0] || null;
}

async function usePasswordResetToken(token, client) {
  await q(`UPDATE password_reset_tokens SET used_at = NOW() WHERE reset_token = $1 AND used_at IS NULL`, [token], client);
}

async function createUserIfMissing({ executiveId, email, displayName }, client) {
  const { rows: existing } = await q(`SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1`, [email], client);
  if (existing[0]) return existing[0];

  const { hashPassword } = require('../shared/security');
  const defaultPassword = `Urbani#${new Date().getFullYear()}`;
  const passwordHash = hashPassword(defaultPassword);

  const { rows } = await q(
    `INSERT INTO users (email, display_name, role, password_hash, executive_id, is_active)
     VALUES ($1,$2,'executive',$3,$4,1)
     RETURNING id`,
    [email, displayName || email, passwordHash, executiveId || null],
    client
  );
  return rows[0];
}

async function listUsers() {
  const { rows } = await q(
    `SELECT id, email, display_name, role, is_active, created_at, updated_at
     FROM users
     ORDER BY lower(email) ASC`,
    []
  );
  return rows;
}

async function updateUserRole(userId, role, client) {
  await q(
    `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2`,
    [role, userId],
    client
  );
}

async function ensureAdminByEmail(email, displayName = 'Administrador') {
  const { hashPassword } = require('../shared/security');
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return null;

  const existing = await q(`SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1`, [normalizedEmail]);
  if (existing.rows[0]) {
    await q(`UPDATE users SET role = 'admin', is_active = 1, updated_at = NOW() WHERE id = $1`, [existing.rows[0].id]);
    return existing.rows[0];
  }

  const defaultPassword = `Urbani#${new Date().getFullYear()}`;
  const passwordHash = hashPassword(defaultPassword);
  const created = await q(
    `INSERT INTO users (email, display_name, role, password_hash, executive_id, is_active)
     VALUES ($1,$2,'admin',$3,NULL,1)
     RETURNING id`,
    [normalizedEmail, displayName, passwordHash]
  );
  return created.rows[0] || null;
}

async function createUserFromSupabase({ email, displayName }, client) {
  const { hashPassword } = require('../shared/security');
  const placeholder = hashPassword(`supabase-${Date.now()}-${Math.random()}`);
  const { rows } = await q(
    `INSERT INTO users (email, display_name, role, password_hash, executive_id, is_active)
     VALUES ($1,$2,'executive',$3,NULL,1)
     RETURNING *`,
    [String(email).toLowerCase(), displayName || email, placeholder],
    client
  );
  return rows[0] || null;
}

async function activateUser(userId, client) {
  await q(`UPDATE users SET is_active = 1, updated_at = NOW() WHERE id = $1`, [userId], client);
}

module.exports = {
  q,
  findUserByEmail,
  findAnyUserByEmail,
  findUserById,
  createSession,
  findSession,
  revokeSession,
  revokeAllUserSessions,
  updatePasswordHash,
  createPasswordResetToken,
  findPasswordResetToken,
  usePasswordResetToken,
  createUserIfMissing,
  listUsers,
  updateUserRole,
  ensureAdminByEmail,
  createUserFromSupabase,
  activateUser
};
