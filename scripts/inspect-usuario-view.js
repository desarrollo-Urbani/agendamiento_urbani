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

  const conn = await mysql.createConnection(cfg);
  console.log('CONNECTED');

  const [cols] = await conn.query('DESCRIBE USUARIO_VIEW');
  console.log('\n--- COLUMNAS ---');
  for (const c of cols) {
    console.log(`${c.Field} | ${c.Type} | NULL: ${c.Null} | Default: ${c.Default}`);
  }

  const [rows] = await conn.query('SELECT * FROM USUARIO_VIEW LIMIT 3');
  console.log('\n--- MUESTRA (3 filas) ---');
  console.log(JSON.stringify(rows, null, 2));

  const [cont] = await conn.query('SELECT COUNT(*) AS total FROM USUARIO_VIEW');
  console.log(`\nTOTAL_ROWS=${cont[0].total}`);

  await conn.end();
  console.log('DONE');
}

main().catch((err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
