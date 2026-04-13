const { getMobyPool } = require('../db/mobyConnection');

const VALID_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Devuelve todos los usuarios activos de USUARIO_VIEW con email válido.
 * @returns {Promise<Array<{id, username, nombre, apellido, email, perfil}>>}
 */
async function getActiveUsers() {
  const pool = getMobyPool();
  const [rows] = await pool.query(
    `SELECT ID_USUARIO, NOMBRE_USUARIO, NOMBRE, APELLIDO, EMAIL, NOMBRE_PERFIL
     FROM USUARIO_VIEW
     WHERE ACTIVO = 1
       AND EMAIL IS NOT NULL
       AND TRIM(EMAIL) != ''
     ORDER BY ID_USUARIO ASC`
  );
  return rows
    .map((r) => ({
      id: r.ID_USUARIO,
      username: r.NOMBRE_USUARIO,
      nombre: String(r.NOMBRE || '').trim(),
      apellido: String(r.APELLIDO || '').trim(),
      email: String(r.EMAIL || '').toLowerCase().trim(),
      perfil: r.NOMBRE_PERFIL || null
    }))
    .filter((u) => VALID_EMAIL_RE.test(u.email));
}

/**
 * Devuelve true si el email tiene ACTIVO=1 en USUARIO_VIEW.
 * @param {string} email
 * @returns {Promise<boolean>}
 */
async function isUserActiveInMoby(email) {
  const pool = getMobyPool();
  const [rows] = await pool.query(
    `SELECT ID_USUARIO FROM USUARIO_VIEW
     WHERE LOWER(TRIM(EMAIL)) = LOWER(TRIM(?)) AND ACTIVO = 1 LIMIT 1`,
    [email]
  );
  return rows.length > 0;
}

module.exports = { getActiveUsers, isUserActiveInMoby };
