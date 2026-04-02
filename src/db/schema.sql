PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS blocks;
DROP TABLE IF EXISTS visits;
DROP TABLE IF EXISTS availability;
DROP TABLE IF EXISTS executives;
DROP TABLE IF EXISTS projects;

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  typologies TEXT,
  delivery_date TEXT,
  sales_office_address TEXT,
  attention_hours TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS executives (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS availability (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  executive_id INTEGER NOT NULL,
  slot_start TEXT NOT NULL,
  slot_end TEXT NOT NULL,
  is_booked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (executive_id) REFERENCES executives(id)
);

CREATE TABLE IF NOT EXISTS visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  executive_id INTEGER NOT NULL,
  availability_id INTEGER,
  client_name TEXT NOT NULL,
  client_email TEXT,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'booked',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (executive_id) REFERENCES executives(id),
  FOREIGN KEY (availability_id) REFERENCES availability(id)
);

CREATE TABLE IF NOT EXISTS blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  executive_id INTEGER NOT NULL,
  reason TEXT,
  block_start TEXT NOT NULL,
  block_end TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (executive_id) REFERENCES executives(id)
);
