const fs = require('fs');
const path = require('path');

function loadDotEnv() {
  const envPath = path.join(__dirname, '..', '..', '.env');
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) return;

    const [key, ...rest] = trimmed.split('=');
    const value = rest.join('=').trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  });
}

loadDotEnv();

const ENV = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3100),
  databaseUrl: process.env.DATABASE_URL || '',
  corsOrigins: process.env.CORS_ORIGINS || '*',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseJwtAudience: process.env.SUPABASE_JWT_AUDIENCE || 'authenticated',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '',
  onlyAllowedEmail: String(process.env.ONLY_ALLOWED_EMAIL || 'desarrollo@urbani.cl').trim().toLowerCase(),
  sessionCookieName: process.env.SESSION_COOKIE_NAME || 'urbani_session',
  sessionTtlHours: Number(process.env.SESSION_TTL_HOURS || 24),
  resetTtlMinutes: Number(process.env.RESET_TTL_MINUTES || 30),
  // AWS Moby MySQL replica
  mobyDbHost: process.env.MOBY_REPLICA_DB_HOST || '',
  mobyDbPort: Number(process.env.MOBY_REPLICA_DB_PORT || 3306),
  mobyDbName: process.env.MOBY_REPLICA_DB_NAME || '',
  mobyDbUser: process.env.MOBY_REPLICA_DB_USER || '',
  mobyDbPassword: process.env.MOBY_REPLICA_DB_PASSWORD || ''
};

module.exports = ENV;
