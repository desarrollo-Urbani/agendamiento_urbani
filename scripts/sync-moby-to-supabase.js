/**
 * sync-moby-to-supabase.js
 * ------------------------------------------------------------------
 * Lee todos los usuarios ACTIVOS de USUARIO_VIEW (AWS MySQL Moby)
 * y los sincroniza con Supabase Auth y la tabla local "users".
 *
 * Modos:
 *   node scripts/sync-moby-to-supabase.js          → dry-run (solo muestra plan)
 *   node scripts/sync-moby-to-supabase.js --apply  → aplica cambios reales
 *
 * Programar diariamente con cron (Linux/Mac):
 *   0 6 * * * cd /ruta/urbani_spec_pro && node scripts/sync-moby-to-supabase.js --apply >> logs/sync.log 2>&1
 *
 * En Windows Task Scheduler: apuntar a este script con --apply
 * ------------------------------------------------------------------
 */

const ENV = require('../src/config/env');
const pool = require('../src/db/connection');
const mobyRepo = require('../src/repositories/mobyRepository');
const { endMobyPool } = require('../src/db/mobyConnection');

const SUPABASE_URL = ENV.supabaseUrl;
const SERVICE_KEY = ENV.supabaseServiceKey;
const ONLY_ALLOWED_EMAIL = String(ENV.onlyAllowedEmail || '').toLowerCase();
const USE_EMAIL_FILTER = Boolean(ONLY_ALLOWED_EMAIL);
const applyMode = process.argv.includes('--apply');
const dryRun = !applyMode;

// ──────────────────── helpers Supabase Admin ────────────────────

async function supabaseAdmin(path, options = {}) {
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

/** Devuelve Map<email_lower → { id, email, banned_until }> de todos los usuarios en Supabase Auth */
async function listSupabaseUsers() {
  const map = new Map();
  let page = 1;
  const perPage = 1000;
  while (true) {
    const r = await supabaseAdmin(`/auth/v1/admin/users?page=${page}&per_page=${perPage}`);
    if (!r.ok) throw new Error(`Error listando Supabase users p${page}: ${r.status} ${JSON.stringify(r.body)}`);
    const users = Array.isArray(r.body && r.body.users) ? r.body.users : [];
    for (const u of users) {
      if (u.email) map.set(String(u.email).toLowerCase(), u);
    }
    if (users.length < perPage) break;
    page++;
  }
  return map;
}

/** Invita un usuario → Supabase le envía email para establecer contraseña */
async function inviteUser({ email, displayName, role }) {
  const inviteResponse = await supabaseAdmin('/auth/v1/admin/invite', {
    method: 'POST',
    body: JSON.stringify({
      email,
      data: { full_name: displayName, app_role: role || 'executive' }
    })
  });

  // Algunos proyectos/dev entornos no exponen /admin/invite; fallback a creación directa.
  if (inviteResponse.status === 404) {
    const tempPassword = `Temp#${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return supabaseAdmin('/auth/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: displayName,
          app_role: role || 'executive'
        }
      })
    });
  }

  return inviteResponse;
}

/** Desbanea un usuario que existía pero estaba bloqueado */
async function unbanUser(supabaseUserId) {
  return supabaseAdmin(`/auth/v1/admin/users/${supabaseUserId}`, {
    method: 'PUT',
    body: JSON.stringify({ ban_duration: 'none', is_sso_user: false })
  });
}

/** Banea a un usuario inactivo (duración: ~100 años) */
async function banUser(supabaseUserId) {
  return supabaseAdmin(`/auth/v1/admin/users/${supabaseUserId}`, {
    method: 'PUT',
    body: JSON.stringify({ ban_duration: '876600h' })
  });
}

function isBanned(supabaseUser) {
  if (!supabaseUser.banned_until) return false;
  return new Date(supabaseUser.banned_until) > new Date();
}

// ──────────────────── helpers BD local (PostgreSQL) ─────────────

async function upsertLocalUser({ email, displayName }, client) {
  const existing = await (client || pool).query(
    `SELECT id, is_active FROM users WHERE lower(email) = lower($1) LIMIT 1`,
    [email]
  );
  if (existing.rows[0]) {
    if (Number(existing.rows[0].is_active) !== 1) {
      await (client || pool).query(
        `UPDATE users SET is_active = 1, display_name = $1, updated_at = NOW() WHERE id = $2`,
        [displayName, existing.rows[0].id]
      );
    }
    return existing.rows[0].id;
  }
  const { hashPassword } = require('../src/shared/security');
  const placeholder = hashPassword(`moby-sync-${email}-${Date.now()}`);
  const ins = await (client || pool).query(
    `INSERT INTO users (email, display_name, role, password_hash, is_active)
     VALUES ($1, $2, 'executive', $3, 1)
     RETURNING id`,
    [email, displayName, placeholder]
  );
  return ins.rows[0].id;
}

async function deactivateLocalUser(email) {
  await pool.query(
    `UPDATE users SET is_active = 0, updated_at = NOW() WHERE lower(email) = lower($1)`,
    [email]
  );
}

// ──────────────────── lógica principal ──────────────────────────

function maskEmail(email) {
  const s = String(email || '');
  const [name, domain] = s.split('@');
  if (!name || !domain) return s;
  if (name.length <= 2) return `${name[0] || '*'}*@${domain}`;
  return `${name.slice(0, 2)}***@${domain}`;
}

async function run() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (SUPABASE_SECRET_KEY) en .env');
  }

  console.log(`\n=== SYNC MOBY → SUPABASE AUTH [${dryRun ? 'DRY-RUN' : 'APPLY'}] ${new Date().toISOString()} ===\n`);

  // 1. Obtener usuarios activos de Moby
  console.log('Leyendo USUARIO_VIEW (ACTIVO=1)...');
  const allMobyUsers = await mobyRepo.getActiveUsers();
  const mobyUsers = USE_EMAIL_FILTER
    ? allMobyUsers.filter((u) => u.email === ONLY_ALLOWED_EMAIL)
    : allMobyUsers;
  const mobyMap = new Map(mobyUsers.map((u) => [u.email, u]));
  console.log(`  → ${allMobyUsers.length} usuarios activos con email válido`);
  if (USE_EMAIL_FILTER) {
    console.log(`  → ${mobyUsers.length} usuarios tras filtro ONLY_ALLOWED_EMAIL=${ONLY_ALLOWED_EMAIL}\n`);
  } else {
    console.log(`  → ${mobyUsers.length} usuarios a sincronizar (sin filtro por email)\n`);
  }

  // 2. Obtener usuarios actuales en Supabase Auth
  console.log('Leyendo usuarios Supabase Auth...');
  const supabaseMap = await listSupabaseUsers();
  console.log(`  → ${supabaseMap.size} usuarios en Supabase Auth\n`);

  const stats = { invited: 0, unbanned: 0, banned: 0, skipped: 0, localSynced: 0, errors: 0 };

  // 3. Para cada usuario activo en Moby → asegurar que existe en Supabase
  console.log('--- Sincronizando activos Moby → Supabase ---');
  for (const mobyUser of mobyUsers) {
    const { email, nombre, apellido, perfil } = mobyUser;
    const displayName = [nombre, apellido].filter(Boolean).join(' ') || email;
    const role = perfil || 'executive';
    const supaUser = supabaseMap.get(email);

    try {
      if (!supaUser) {
        // Usuario no existe → invitar
        console.log(`[INVITE] ${maskEmail(email)} (${role})`);
        if (!dryRun) {
          const r = await inviteUser({ email, displayName, role });
          if (!r.ok) {
            console.error(`  → ERROR invite: ${r.status} ${JSON.stringify(r.body)}`);
            stats.errors++;
            continue;
          }
          await upsertLocalUser({ email, displayName });
          stats.localSynced++;
        }
        stats.invited++;
      } else if (isBanned(supaUser)) {
        // Usuario existe pero estaba baneado → desbanear
        console.log(`[UNBAN]  ${maskEmail(email)}`);
        if (!dryRun) {
          const r = await unbanUser(supaUser.id);
          if (!r.ok) {
            console.error(`  → ERROR unban: ${r.status} ${JSON.stringify(r.body)}`);
            stats.errors++;
            continue;
          }
          await upsertLocalUser({ email, displayName });
          stats.localSynced++;
        }
        stats.unbanned++;
      } else {
        // Ya existe y activo → solo sincronizar BD local
        if (!dryRun) {
          await upsertLocalUser({ email, displayName });
          stats.localSynced++;
        }
        stats.skipped++;
      }
    } catch (err) {
      console.error(`[ERROR]  ${maskEmail(email)}: ${err.message}`);
      stats.errors++;
    }
  }

  // 4. Para usuarios en Supabase que YA NO están activos en Moby → banear
  console.log('\n--- Baneando en Supabase usuarios inactivos en Moby ---');
  let banned = 0;
  for (const [supaEmail, supaUser] of supabaseMap) {
    if (mobyMap.has(supaEmail)) continue;       // sigue activo en Moby
    if (isBanned(supaUser)) continue;           // ya estaba baneado
    // Si hay filtro, mantener ese correo permitido.
    if (USE_EMAIL_FILTER && supaEmail === ONLY_ALLOWED_EMAIL) continue;

    console.log(`[BAN]    ${maskEmail(supaEmail)} (no está activo en Moby)`);
    if (!dryRun) {
      try {
        const r = await banUser(supaUser.id);
        if (!r.ok) {
          console.error(`  → ERROR ban: ${r.status} ${JSON.stringify(r.body)}`);
          stats.errors++;
          continue;
        }
        await deactivateLocalUser(supaEmail);
      } catch (err) {
        console.error(`  → ERROR ban local: ${err.message}`);
        stats.errors++;
        continue;
      }
    }
    stats.banned++;
    banned++;
  }
  if (banned === 0) console.log('  → Ninguno necesita ser baneado.');

  // 5. Resumen
  console.log('\n=== RESUMEN ===');
  console.log(`  Usuarios activos Moby   : ${mobyUsers.length}`);
  console.log(`  Invitados (nuevo)       : ${stats.invited}`);
  console.log(`  Desbaneados             : ${stats.unbanned}`);
  console.log(`  Ya ok (sin cambio)      : ${stats.skipped}`);
  console.log(`  Baneados (inactivos)    : ${stats.banned}`);
  console.log(`  BD local sincronizada   : ${stats.localSynced}`);
  console.log(`  Errores                 : ${stats.errors}`);
  if (dryRun) {
    console.log('\n  ⚠  MODO DRY-RUN — ningún cambio fue aplicado.');
    console.log('     Ejecuta con --apply para aplicar.\n');
  } else {
    console.log('\n  ✓  Sincronización completa.\n');
  }
}

run()
  .catch((err) => {
    console.error('\nFATAL:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await endMobyPool();
    await pool.end();
  });
