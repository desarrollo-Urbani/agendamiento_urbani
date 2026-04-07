const path = require('path');
const fs = require('fs');
const pool = require('./connection');

const schemaPath = path.join(__dirname, 'schema.sql');
const schemaSql = fs.readFileSync(schemaPath, 'utf8');

async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(schemaSql);
    console.log('Database initialized successfully.');
  } finally {
    client.release();
    await pool.end();
  }
}

initDb().catch((error) => {
  console.error('Init failed:', error.message);
  process.exitCode = 1;
});
