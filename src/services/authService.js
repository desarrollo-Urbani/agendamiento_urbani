const ENV = require('../config/env');
const repo = require('../repositories/authRepository');
const { AppError } = require('../shared/errors');
const { hashPassword, verifyPassword, randomToken } = require('../shared/security');
const { verifySupabaseJwt } = require('../shared/supabaseAuth');
const PROTECTED_ADMIN_EMAIL = 'desarrollo@urbani.cl';
const ONLY_ALLOWED_EMAIL = String(ENV.onlyAllowedEmail || '').toLowerCase();

function toUserDTO(row) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    executiveId: row.executive_id,
    projectId: row.project_id || null,
    executiveName: row.executive_name || null
  };
}

function buildExpiryDate(hours) {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date;
}

async function login({ email, password, ipAddress, userAgent }) {
  const user = await repo.findUserByEmail(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    throw new AppError('Credenciales invalidas', 401, 'AUTH_INVALID');
  }

  const token = randomToken(48);
  const expiresAt = buildExpiryDate(ENV.sessionTtlHours);
  await repo.createSession({ userId: user.id, token, expiresAt, ipAddress, userAgent });

  return {
    sessionToken: token,
    expiresAt,
    user: toUserDTO(user)
  };
}

async function loginByEmail({ email, ipAddress, userAgent }) {
  const user = await repo.findUserByEmail(email);
  if (!user) {
    throw new AppError('Usuario no encontrado', 404, 'NOT_FOUND');
  }

  const token = randomToken(48);
  const expiresAt = buildExpiryDate(ENV.sessionTtlHours);
  await repo.createSession({ userId: user.id, token, expiresAt, ipAddress, userAgent });

  return {
    sessionToken: token,
    expiresAt,
    user: toUserDTO(user)
  };
}

async function logout(token) {
  if (!token) return;
  await repo.revokeSession(token);
}

async function resolveSession(token) {
  if (!token) return null;
  const session = await repo.findSession(token);
  if (!session) return null;

  const user = await repo.findUserById(session.user_id);
  if (!user) return null;

  return {
    user: toUserDTO(user),
    session
  };
}

async function changePassword({ userId, currentPassword, newPassword }) {
  const user = await repo.findUserById(userId);
  if (!user) throw new AppError('Usuario no encontrado', 404, 'NOT_FOUND');
  if (!verifyPassword(currentPassword, user.password_hash)) {
    throw new AppError('Contrasena actual invalida', 400, 'VALIDATION_ERROR');
  }

  const nextHash = hashPassword(newPassword);
  await repo.updatePasswordHash(userId, nextHash);
  await repo.revokeAllUserSessions(userId);
  return { success: true };
}

async function requestPasswordReset({ email, ipAddress, userAgent }) {
  const user = await repo.findUserByEmail(email);
  if (!user) return { success: true };

  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + ENV.resetTtlMinutes * 60 * 1000);
  await repo.createPasswordResetToken({ userId: user.id, token, expiresAt, ipAddress, userAgent });

  return {
    success: true,
    resetToken: ENV.nodeEnv === 'development' ? token : undefined
  };
}

async function resetPassword({ token, newPassword }) {
  const reset = await repo.findPasswordResetToken(token);
  if (!reset) {
    throw new AppError('Token de recuperacion invalido o expirado', 400, 'VALIDATION_ERROR');
  }

  const nextHash = hashPassword(newPassword);
  await repo.updatePasswordHash(reset.user_id, nextHash);
  await repo.usePasswordResetToken(token);
  await repo.revokeAllUserSessions(reset.user_id);
  return { success: true };
}

function requireAdmin(user) {
  if (!user || user.role !== 'admin') {
    throw new AppError('Acceso restringido a administradores', 403, 'FORBIDDEN');
  }
}

async function listUsersForAdmin(currentUser) {
  requireAdmin(currentUser);
  const rows = await repo.listUsers();
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    isActive: Number(row.is_active) === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isProtectedAdmin: String(row.email).toLowerCase() === PROTECTED_ADMIN_EMAIL
  }));
}

async function updateUserRoleForAdmin({ currentUser, userId, role }) {
  requireAdmin(currentUser);
  const target = await repo.findUserById(userId);
  if (!target) throw new AppError('Usuario no encontrado', 404, 'NOT_FOUND');
  const targetEmail = String(target.email || '').toLowerCase();

  if (targetEmail === PROTECTED_ADMIN_EMAIL && role !== 'admin') {
    throw new AppError('No se puede remover el rol admin del usuario protegido', 400, 'VALIDATION_ERROR');
  }
  if (target.id === currentUser.id && role !== 'admin') {
    throw new AppError('No puedes quitarte el rol de administrador a ti mismo', 400, 'VALIDATION_ERROR');
  }

  await repo.updateUserRole(target.id, role);
  return {
    id: target.id,
    email: target.email,
    role
  };
}

async function ensureDefaultAdmin() {
  await repo.ensureAdminByEmail(PROTECTED_ADMIN_EMAIL, 'Administrador Principal');
}

async function resolveAccessToken(accessToken) {
  const claims = await verifySupabaseJwt(accessToken);
  const email = String(claims.email || '').toLowerCase();
  if (!email) throw new AppError('Token sin email', 401, 'AUTH_INVALID');
  if (ONLY_ALLOWED_EMAIL && email !== ONLY_ALLOWED_EMAIL) {
    throw new AppError('Acceso temporal restringido', 403, 'FORBIDDEN');
  }

  let user = await repo.findAnyUserByEmail(email);
  if (!user) {
    // Primera vez: crear registro local (será desactivado si el sync no lo confirma)
    user = await repo.createUserFromSupabase({
      email,
      displayName: claims.user_metadata && claims.user_metadata.full_name
        ? claims.user_metadata.full_name
        : email
    });
  }

  // La fuente de verdad de activación es la BD local (sincronizada diariamente desde Moby).
  // NO se auto-activa: si is_active=0 el usuario fue deshabilitado en Moby.
  if (!user || Number(user.is_active) !== 1) {
    throw new AppError('Usuario no autorizado. Contacta al administrador.', 403, 'USER_INACTIVE');
  }

  return {
    user: toUserDTO(user),
    claims
  };
}

module.exports = {
  login,
  loginByEmail,
  logout,
  resolveSession,
  changePassword,
  requestPasswordReset,
  resetPassword,
  listUsersForAdmin,
  updateUserRoleForAdmin,
  ensureDefaultAdmin,
  resolveAccessToken
};
