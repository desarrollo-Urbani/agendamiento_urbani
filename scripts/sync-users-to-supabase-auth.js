const ENV = require('../src/config/env');
const pool = require('../src/db/connection');

const SUPABASE_URL = ENV.supabaseUrl || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
const applyMode = process.argv.includes('--apply');
const dryRun = !applyMode;

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function maskEmail(email) {
  const s = String(email || '');
  const [name, domain] = s.split('@');
  if (!name || !domain) return s;
  if (name.length <= 2) return `${name[0] || '*'}*@${domain}`;
  return `${name.slice(0, 2)}***@${domain}`;
}

async function supabaseRequest(path, options = {}) {
  const url = `${SUPABASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  let body = null;
  try { body = await res.json(); } catch (_) {}
  return { ok: res.ok, status: res.status, body };
}

async function userExistsInSupabase(email) {
  const q = encodeURIComponent(email);
  const response = await supabaseRequest(`/auth/v1/admin/users?email=${q}`);
  if (!response.ok) {
    throw new Error(`No se pudo consultar usuario ${email}: ${response.status} ${JSON.stringify(response.body)}`);
  }
  const users = Array.isArray(response.body && response.body.users) ? response.body.users : [];
  return users.some((u) => String(u.email || '').toLowerCase() === String(email).toLowerCase());
}

async function createSupabaseUser({ email, displayName, role }) {
  const payload = {
    email,
    password: `Urbani#${new Date().getFullYear()}`,
    email_confirm: true,
    user_metadata: {
      full_name: displayName || email,
      app_role: role || 'executive'
    }
  };
  return supabaseRequest('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

async function run() {
  if (!SUPABASE_URL) {
    throw new Error('Falta SUPABASE_URL en .env');
  }
  if (!SERVICE_KEY) {
    throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY (o SUPABASE_SECRET_KEY) en .env');
  }

  const { rows } = await pool.query(
    `SELECT id, email, display_name, role, is_active
     FROM users
     WHERE is_active = 1
     ORDER BY id ASC`
  );

  const candidates = rows.filter((u) => isValidEmail(u.email));
  console.log(`Usuarios activos locales: ${rows.length}`);
  console.log(`Usuarios con email valido: ${candidates.length}`);
  console.log(`Modo: ${dryRun ? 'DRY-RUN (sin cambios)' : 'APPLY (crea usuarios en Supabase Auth)'}`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of candidates) {
    const email = String(user.email).toLowerCase().trim();
    try {
      const exists = await userExistsInSupabase(email);
      if (exists) {
        skipped += 1;
        console.log(`[SKIP] ${maskEmail(email)} ya existe`);
        continue;
      }

      if (dryRun) {
        created += 1;
        console.log(`[PLAN] Crear ${maskEmail(email)} (${user.role})`);
        continue;
      }

      const createdRes = await createSupabaseUser({
        email,
        displayName: user.display_name,
        role: user.role
      });

      if (!createdRes.ok) {
        failed += 1;
        console.log(`[FAIL] ${maskEmail(email)} -> ${createdRes.status} ${JSON.stringify(createdRes.body)}`);
      } else {
        created += 1;
        console.log(`[OK] ${maskEmail(email)} creado`);
      }
    } catch (error) {
      failed += 1;
      console.log(`[ERROR] ${maskEmail(email)} -> ${error.message}`);
    }
  }

  console.log('--- Resumen ---');
  console.log(`Creados: ${created}`);
  console.log(`Omitidos: ${skipped}`);
  console.log(`Errores: ${failed}`);
}

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

