const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  const env = {};
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const idx = trimmed.indexOf('=');
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return env;
}

async function supabaseAdminRequest({ baseUrl, serviceKey, pathName, method = 'GET', body }) {
  const res = await fetch(`${baseUrl}${pathName}`, {
    method,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  let payload = null;
  try { payload = await res.json(); } catch (_) {}
  return { ok: res.ok, status: res.status, payload };
}

async function purgeSupabaseUsers(env, keepEmails) {
  const supabaseUrl = env.SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !serviceKey) {
    return { skipped: true, reason: 'Missing SUPABASE_URL or service key', deleted: 0, errors: [] };
  }

  let page = 1;
  const perPage = 1000;
  const users = [];
  while (true) {
    const list = await supabaseAdminRequest({
      baseUrl: supabaseUrl,
      serviceKey,
      pathName: `/auth/v1/admin/users?page=${page}&per_page=${perPage}`
    });
    if (!list.ok) {
      return { skipped: false, deleted: 0, errors: [`list users failed: ${list.status}`] };
    }
    const chunk = Array.isArray(list.payload && list.payload.users) ? list.payload.users : [];
    users.push(...chunk);
    if (chunk.length < perPage) break;
    page += 1;
  }

  let deleted = 0;
  const errors = [];
  for (const user of users) {
    const email = String(user.email || '').toLowerCase();
    if (!email || keepEmails.has(email)) continue;
    const del = await supabaseAdminRequest({
      baseUrl: supabaseUrl,
      serviceKey,
      pathName: `/auth/v1/admin/users/${user.id}`,
      method: 'DELETE'
    });
    if (del.ok) {
      deleted += 1;
    } else {
      errors.push(`delete ${email} failed: ${del.status}`);
    }
  }

  return { skipped: false, deleted, errors };
}

async function main() {
  const env = loadEnv();
  const keepEmail = String(env.ONLY_ALLOWED_EMAIL || 'desarrollo@urbani.cl').toLowerCase();
  const keepEmails = new Set([keepEmail]);

  const client = new Client({
    connectionString: env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const before = {};
  for (const table of ['visits', 'availability', 'blocks', 'users', 'user_sessions', 'password_reset_tokens', 'audit_logs']) {
    const r = await client.query(`SELECT COUNT(*)::int AS total FROM ${table}`);
    before[table] = r.rows[0].total;
  }

  await client.query('BEGIN');
  try {
    await client.query('DELETE FROM blocks');
    await client.query('DELETE FROM visits');
    await client.query('DELETE FROM availability');

    await client.query(
      `DELETE FROM user_sessions
       WHERE user_id IN (SELECT id FROM users WHERE lower(email) <> ALL($1::text[]))`,
      [[...keepEmails]]
    );

    await client.query(
      `DELETE FROM password_reset_tokens
       WHERE user_id IN (SELECT id FROM users WHERE lower(email) <> ALL($1::text[]))`,
      [[...keepEmails]]
    );

    // Liberar referencias en bitacora para poder eliminar usuarios historicos.
    await client.query(
      `UPDATE audit_logs
       SET user_id = NULL
       WHERE user_id IN (SELECT id FROM users WHERE lower(email) <> ALL($1::text[]))`,
      [[...keepEmails]]
    );

    await client.query(
      `DELETE FROM users
       WHERE lower(email) <> ALL($1::text[])`,
      [[...keepEmails]]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }

  const after = {};
  for (const table of ['visits', 'availability', 'blocks', 'users', 'user_sessions', 'password_reset_tokens', 'audit_logs']) {
    const r = await client.query(`SELECT COUNT(*)::int AS total FROM ${table}`);
    after[table] = r.rows[0].total;
  }

  const keptUsers = await client.query(
    `SELECT id, email, role, is_active FROM users ORDER BY id ASC`
  );

  await client.end();

  const supabaseResult = await purgeSupabaseUsers(env, keepEmails);

  console.log(JSON.stringify({
    keepEmails: [...keepEmails],
    before,
    after,
    keptUsers: keptUsers.rows,
    supabase: supabaseResult
  }, null, 2));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
