const mysql = require('mysql2/promise');

async function main() {
  const cfg = {
    host: 'mobysuite-gc2-urbani-replica.c1zztf8orfzy.us-east-1.rds.amazonaws.com',
    port: 3306,
    user: 'urbani_gc2_guest_view',
    password: '[#9"tjd:#-?D',
    database: 'mobysuite_gc2_urbani',
    connectTimeout: 15000,
    ssl: { rejectUnauthorized: false }
  };

  console.log('CONNECTING');
  const conn = await mysql.createConnection(cfg);
  console.log('CONNECTED');

  const [tables] = await conn.query(
    'SELECT table_name FROM information_schema.tables WHERE table_schema = ? ORDER BY table_name ASC',
    [cfg.database]
  );

  console.log(`TABLE_COUNT=${tables.length}`);
  for (const row of tables) {
    console.log(row.TABLE_NAME || row.table_name);
  }

  const [hit] = await conn.query(
    'SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND LOWER(table_name) = LOWER(?)',
    [cfg.database, 'USUARIOS_VIEW']
  );

  console.log(`HAS_USUARIOS_VIEW=${hit.length > 0}`);

  await conn.end();
  console.log('DONE');
}

main().catch((err) => {
  console.error(`ERROR_NAME=${err.name}`);
  console.error(`ERROR_CODE=${err.code || ''}`);
  console.error(`ERROR_MSG=${err.message}`);
  process.exit(1);
});
