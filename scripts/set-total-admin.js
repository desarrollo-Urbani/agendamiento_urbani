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

  await client.query(
    "UPDATE users SET role='admin', is_active=1, updated_at=NOW() WHERE lower(email)=lower($1)",
    ['desarrollo@urbani.cl']
  );

  const { rows } = await client.query(
    'SELECT id, email, role, is_active FROM users WHERE lower(email)=lower($1)',
    ['desarrollo@urbani.cl']
  );

  console.log(JSON.stringify(rows, null, 2));
  await client.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
