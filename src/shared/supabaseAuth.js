const { createRemoteJWKSet, jwtVerify } = require('jose');
const ENV = require('../config/env');
const { AppError } = require('./errors');

let jwks = null;

function getJwks() {
  if (!ENV.supabaseUrl) {
    throw new AppError('SUPABASE_URL no configurada', 500, 'CONFIG_ERROR');
  }
  if (!jwks) {
    const url = new URL('/auth/v1/.well-known/jwks.json', ENV.supabaseUrl);
    jwks = createRemoteJWKSet(url);
  }
  return jwks;
}

async function verifySupabaseJwt(token) {
  if (!token) throw new AppError('Token requerido', 401, 'AUTH_REQUIRED');
  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: `${ENV.supabaseUrl}/auth/v1`,
      audience: ENV.supabaseJwtAudience
    });
    return payload;
  } catch (_) {
    throw new AppError('Token invalido o expirado', 401, 'AUTH_INVALID');
  }
}

module.exports = {
  verifySupabaseJwt
};

