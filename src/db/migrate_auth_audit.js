const pool = require('./connection');

const statements = [
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`,

  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'executive',
    password_hash TEXT NOT NULL,
    executive_id INTEGER REFERENCES executives(id),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    session_token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    reset_token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id),
    user_id INTEGER REFERENCES users(id),
    action TEXT NOT NULL,
    module TEXT,
    entity_type TEXT,
    entity_id TEXT,
    description TEXT,
    old_values TEXT,
    new_values TEXT,
    status TEXT NOT NULL DEFAULT 'success',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_audit_logs_project_created_at ON audit_logs(project_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token)`
];

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const sql of statements) {
      await client.query(sql);
    }

    // crear usuarios para ejecutivos sin cuenta
    const execRes = await client.query(`
      SELECT e.id, e.email, e.name
      FROM executives e
      LEFT JOIN users u ON lower(u.email) = lower(e.email)
      WHERE e.email IS NOT NULL AND u.id IS NULL
    `);

    const { hashPassword } = require('../shared/security');
    const defaultPassword = `Urbani#${new Date().getFullYear()}`;
    const passwordHash = hashPassword(defaultPassword);

    for (const ex of execRes.rows) {
      await client.query(
        `INSERT INTO users (email, display_name, role, password_hash, executive_id, is_active)
         VALUES ($1,$2,'executive',$3,$4,1)`,
        [ex.email, ex.name || ex.email, passwordHash, ex.id]
      );
    }

    // crear admin inicial si no existe
    const adminCheck = await client.query(`SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1`, ['admin@urbani.local']);
    if (!adminCheck.rows[0]) {
      await client.query(
        `INSERT INTO users (email, display_name, role, password_hash, is_active)
         VALUES ($1,$2,'admin',$3,1)`,
        ['admin@urbani.local', 'Administrador', passwordHash]
      );
    }

    await client.query('COMMIT');
    console.log('Migration auth/audit completed.');
    console.log(`Default password for new users: ${defaultPassword}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
