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
    const i = trimmed.indexOf('=');
    env[trimmed.slice(0, i)] = trimmed.slice(i + 1);
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const client = new Client({
    connectionString: env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const summary = await client.query(
    `SELECT action, COUNT(*)::int AS total
     FROM audit_logs
     WHERE created_at >= NOW() - INTERVAL '2 days'
     GROUP BY action
     ORDER BY total DESC, action ASC`
  );

  const recent = await client.query(
    `SELECT id, created_at, action, module, user_id, entity_type, entity_id, description
     FROM audit_logs
     ORDER BY id DESC
     LIMIT 30`
  );

  console.log('--- ACTION SUMMARY (last 2 days) ---');
  console.log(JSON.stringify(summary.rows, null, 2));
  console.log('--- RECENT LOGS ---');
  console.log(JSON.stringify(recent.rows, null, 2));

  await client.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
