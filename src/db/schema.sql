DROP TABLE IF EXISTS blocks CASCADE;
DROP TABLE IF EXISTS visits CASCADE;
DROP TABLE IF EXISTS availability CASCADE;
DROP TABLE IF EXISTS executives CASCADE;
DROP TABLE IF EXISTS project_day_blocks CASCADE;
DROP TABLE IF EXISTS project_schedule_rules CASCADE;
DROP TABLE IF EXISTS projects CASCADE;

CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  typologies TEXT,
  delivery_date TEXT,
  sales_office_address TEXT,
  attention_hours TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE executives (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE project_schedule_rules (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  weekday INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  slot_minutes INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE project_day_blocks (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  block_date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  is_full_day INTEGER NOT NULL DEFAULT 1,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE availability (
  id SERIAL PRIMARY KEY,
  executive_id INTEGER NOT NULL REFERENCES executives(id),
  slot_start TEXT NOT NULL,
  slot_end TEXT NOT NULL,
  is_booked INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE visits (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  executive_id INTEGER NOT NULL REFERENCES executives(id),
  availability_id INTEGER REFERENCES availability(id),
  client_name TEXT NOT NULL,
  client_email TEXT,
  unit_to_visit TEXT,
  observation TEXT,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'booked',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE blocks (
  id SERIAL PRIMARY KEY,
  executive_id INTEGER NOT NULL REFERENCES executives(id),
  reason TEXT,
  block_start TEXT NOT NULL,
  block_end TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
