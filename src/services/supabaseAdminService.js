const ENV = require('../config/env');
const { AppError } = require('../shared/errors');

function ensureConfigured() {
  if (!ENV.supabaseUrl || !ENV.supabaseServiceKey) {
    throw new AppError('Supabase Admin API no configurada', 500, 'CONFIG_ERROR');
  }
}

async function adminRequest(path, options = {}) {
  ensureConfigured();
  const res = await fetch(`${ENV.supabaseUrl}${path}`, {
    ...options,
    headers: {
      apikey: ENV.supabaseServiceKey,
      Authorization: `Bearer ${ENV.supabaseServiceKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  let body = null;
  try {
    body = await res.json();
  } catch (_) {
    body = null;
  }

  return { ok: res.ok, status: res.status, body };
}

async function listUsers() {
  const users = [];
  let page = 1;
  const perPage = 500;

  while (true) {
    const response = await adminRequest(`/auth/v1/admin/users?page=${page}&per_page=${perPage}`);
    if (!response.ok) {
      throw new AppError('No se pudo listar usuarios de Supabase', 502, 'SUPABASE_ADMIN_ERROR');
    }

    const batch = Array.isArray(response.body && response.body.users) ? response.body.users : [];
    users.push(...batch);

    if (batch.length < perPage) break;
    page += 1;
  }

  return users.map((u) => ({
    id: u.id,
    email: u.email || null,
    createdAt: u.created_at || null,
    lastSignInAt: u.last_sign_in_at || null,
    bannedUntil: u.banned_until || null,
    emailConfirmedAt: u.email_confirmed_at || null,
    displayName: (u.user_metadata && u.user_metadata.full_name) || null,
    role: (u.user_metadata && u.user_metadata.app_role) || 'executive'
  }));
}

async function createUser({ email, password, displayName, role }) {
  const response = await adminRequest('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: displayName || email,
        app_role: role || 'executive'
      }
    })
  });

  if (!response.ok) {
    const msg = response.body && (response.body.msg || response.body.message || response.body.error_description);
    throw new AppError(msg || 'No se pudo crear usuario en Supabase', 400, 'SUPABASE_ADMIN_ERROR');
  }

  const user = response.body && response.body.user ? response.body.user : response.body;
  return {
    id: user.id,
    email: user.email,
    displayName: (user.user_metadata && user.user_metadata.full_name) || null,
    role: (user.user_metadata && user.user_metadata.app_role) || 'executive'
  };
}

async function deleteUserById(userId) {
  const response = await adminRequest(`/auth/v1/admin/users/${userId}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    throw new AppError('No se pudo eliminar usuario en Supabase', 400, 'SUPABASE_ADMIN_ERROR');
  }
  return { success: true };
}

async function updateUserPassword(userId, password) {
  const response = await adminRequest(`/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify({ password })
  });

  if (!response.ok) {
    throw new AppError('No se pudo actualizar la contrasena en Supabase', 400, 'SUPABASE_ADMIN_ERROR');
  }
  return { success: true };
}

module.exports = {
  listUsers,
  createUser,
  deleteUserById,
  updateUserPassword
};
