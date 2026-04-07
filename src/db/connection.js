const { Pool } = require('pg');
const ENV = require('../config/env');

const pool = new Pool({
  connectionString: ENV.databaseUrl,
  ssl: ENV.nodeEnv === 'production' ? { rejectUnauthorized: false } : false
});

module.exports = pool;
