const { DatabaseSync } = require('node:sqlite');
const ENV = require('../config/env');

const db = new DatabaseSync(ENV.dbPath);
db.exec('PRAGMA foreign_keys = ON;');

module.exports = db;
