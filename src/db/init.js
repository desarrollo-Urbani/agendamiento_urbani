const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const dbPath = path.join(__dirname, '..', '..', 'data.sqlite');
const schemaPath = path.join(__dirname, 'schema.sql');
const schemaSql = fs.readFileSync(schemaPath, 'utf8');

const db = new DatabaseSync(dbPath);
db.exec(schemaSql);
db.close();

console.log(`Database initialized at ${dbPath}`);
