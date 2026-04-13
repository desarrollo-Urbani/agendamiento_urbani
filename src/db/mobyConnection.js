const mysql = require('mysql2/promise');
const ENV = require('../config/env');

let pool = null;

function getMobyPool() {
  if (pool) return pool;
  if (!ENV.mobyDbHost) {
    throw new Error('MOBY_REPLICA_DB_HOST no configurado en .env');
  }
  pool = mysql.createPool({
    host: ENV.mobyDbHost,
    port: ENV.mobyDbPort,
    user: ENV.mobyDbUser,
    password: ENV.mobyDbPassword,
    database: ENV.mobyDbName,
    ssl: { rejectUnauthorized: false },
    connectTimeout: 15000,
    connectionLimit: 3,
    waitForConnections: true,
    queueLimit: 10
  });
  return pool;
}

async function endMobyPool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = { getMobyPool, endMobyPool };
