const db = require('../db/connection');

function inTransaction(work) {
  db.exec('BEGIN');
  try {
    const result = work();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch (_rollbackError) {
      // Ignore rollback failure.
    }
    throw error;
  }
}

function listProjects() {
  return db
    .prepare(
      `SELECT p.*, e.id AS manager_id, e.name AS manager_name, e.email AS manager_email
       FROM projects p
       LEFT JOIN executives e ON e.id = (
         SELECT id FROM executives ex
         WHERE ex.project_id = p.id
         ORDER BY ex.id ASC
         LIMIT 1
       )
       ORDER BY p.id ASC`
    )
    .all();
}

function createProject(input) {
  return db
    .prepare(
      `INSERT INTO projects (name, attention_hours)
       VALUES (:name, :attentionHours)`
    )
    .run(input);
}

function updateProject(input) {
  return db
    .prepare(
      `UPDATE projects
       SET name = :name,
           attention_hours = :attentionHours
       WHERE id = :projectId`
    )
    .run(input);
}

function listExecutives(filters) {
  const conditions = ['1 = 1'];
  const params = {};

  if (filters.projectId) {
    conditions.push('e.project_id = :projectId');
    params.projectId = filters.projectId;
  }

  return db
    .prepare(
      `SELECT e.*, p.name AS project_name
       FROM executives e
       JOIN projects p ON p.id = e.project_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY e.name ASC`
    )
    .all(params);
}

function listAvailability(filters) {
  const conditions = ['a.is_booked = 0'];
  const params = {};

  if (filters.executiveId) {
    conditions.push('a.executive_id = :executiveId');
    params.executiveId = filters.executiveId;
  }

  if (filters.projectId) {
    conditions.push('e.project_id = :projectId');
    params.projectId = filters.projectId;
  }

  return db
    .prepare(
      `SELECT a.*, e.project_id
       FROM availability a
       JOIN executives e ON e.id = a.executive_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY a.slot_start ASC`
    )
    .all(params);
}

function listVisits(filters) {
  const conditions = ['1 = 1'];
  const params = {};

  if (filters.projectId) {
    conditions.push('v.project_id = :projectId');
    params.projectId = filters.projectId;
  }
  if (filters.from) {
    conditions.push('v.starts_at >= :from');
    params.from = filters.from;
  }
  if (filters.to) {
    conditions.push('v.ends_at <= :to');
    params.to = filters.to;
  }

  return db
    .prepare(
      `SELECT v.*, e.name AS executive_name, p.name AS project_name
       FROM visits v
       JOIN executives e ON e.id = v.executive_id
       JOIN projects p ON p.id = v.project_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY v.starts_at ASC`
    )
    .all(params);
}

function listBlocks(filters) {
  const conditions = ['1 = 1'];
  const params = {};

  if (filters.projectId) {
    conditions.push('e.project_id = :projectId');
    params.projectId = filters.projectId;
  }
  if (filters.from) {
    conditions.push('b.block_start >= :from');
    params.from = filters.from;
  }
  if (filters.to) {
    conditions.push('b.block_end <= :to');
    params.to = filters.to;
  }

  return db
    .prepare(
      `SELECT b.*, e.project_id, e.name AS executive_name
       FROM blocks b
       JOIN executives e ON e.id = b.executive_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY b.block_start ASC`
    )
    .all(params);
}

function listCalendar(filters) {
  const availabilityConditions = ['1 = 1'];
  const visitsConditions = ['1 = 1'];
  const blocksConditions = ['1 = 1'];
  const params = {};

  if (filters.projectId) {
    availabilityConditions.push('e.project_id = :projectId');
    visitsConditions.push('v.project_id = :projectId');
    blocksConditions.push('e.project_id = :projectId');
    params.projectId = filters.projectId;
  }
  if (filters.from) {
    availabilityConditions.push('a.slot_start >= :from');
    visitsConditions.push('v.starts_at >= :from');
    blocksConditions.push('b.block_start >= :from');
    params.from = filters.from;
  }
  if (filters.to) {
    availabilityConditions.push('a.slot_end <= :to');
    visitsConditions.push('v.ends_at <= :to');
    blocksConditions.push('b.block_end <= :to');
    params.to = filters.to;
  }

  return {
    availability: db
      .prepare(
        `SELECT a.*, e.project_id, e.name AS executive_name
         FROM availability a
         JOIN executives e ON e.id = a.executive_id
         WHERE ${availabilityConditions.join(' AND ')}
         ORDER BY a.slot_start ASC`
      )
      .all(params),
    visits: db
      .prepare(
        `SELECT v.*, e.name AS executive_name
         FROM visits v
         JOIN executives e ON e.id = v.executive_id
         WHERE ${visitsConditions.join(' AND ')}
         ORDER BY v.starts_at ASC`
      )
      .all(params),
    blocks: db
      .prepare(
        `SELECT b.*, e.project_id, e.name AS executive_name
         FROM blocks b
         JOIN executives e ON e.id = b.executive_id
         WHERE ${blocksConditions.join(' AND ')}
         ORDER BY b.block_start ASC`
      )
      .all(params)
  };
}

function findOpenAvailability(availabilityId, executiveId) {
  return db
    .prepare('SELECT * FROM availability WHERE id = :availabilityId AND executive_id = :executiveId AND is_booked = 0')
    .get({ availabilityId, executiveId });
}

function findBookedVisit(visitId) {
  return db.prepare('SELECT * FROM visits WHERE id = :visitId AND status = :status').get({ visitId, status: 'booked' });
}

function findProjectById(projectId) {
  return db.prepare('SELECT * FROM projects WHERE id = :projectId').get({ projectId });
}

function findExecutiveById(executiveId) {
  return db.prepare('SELECT * FROM executives WHERE id = :executiveId').get({ executiveId });
}

function findPrimaryExecutiveByProjectId(projectId) {
  return db
    .prepare(
      `SELECT *
       FROM executives
       WHERE project_id = :projectId
       ORDER BY id ASC
       LIMIT 1`
    )
    .get({ projectId });
}

function createExecutive(input) {
  return db
    .prepare(
      `INSERT INTO executives (project_id, name, email)
       VALUES (:projectId, :name, :email)`
    )
    .run(input);
}

function updateExecutive(input) {
  return db
    .prepare(
      `UPDATE executives
       SET name = :name,
           email = :email
       WHERE id = :executiveId`
    )
    .run(input);
}

function createVisit(input) {
  return db
    .prepare(
      `INSERT INTO visits (project_id, executive_id, availability_id, client_name, client_email, starts_at, ends_at)
       VALUES (:projectId, :executiveId, :availabilityId, :clientName, :clientEmail, :startsAt, :endsAt)`
    )
    .run(input);
}

function markAvailabilityBooked(availabilityId) {
  return db.prepare('UPDATE availability SET is_booked = 1 WHERE id = :availabilityId').run({ availabilityId });
}

function markAvailabilityFree(availabilityId) {
  return db.prepare('UPDATE availability SET is_booked = 0 WHERE id = :availabilityId').run({ availabilityId });
}

function updateVisitSchedule(input) {
  return db
    .prepare(
      `UPDATE visits
       SET availability_id = :availabilityId, starts_at = :startsAt, ends_at = :endsAt, updated_at = datetime('now')
       WHERE id = :visitId`
    )
    .run(input);
}

function cancelVisit(visitId) {
  return db
    .prepare("UPDATE visits SET status = 'cancelled', updated_at = datetime('now') WHERE id = :visitId")
    .run({ visitId });
}

module.exports = {
  inTransaction,
  listProjects,
  createProject,
  updateProject,
  listExecutives,
  listAvailability,
  listVisits,
  listBlocks,
  listCalendar,
  findOpenAvailability,
  findBookedVisit,
  findProjectById,
  findExecutiveById,
  findPrimaryExecutiveByProjectId,
  createExecutive,
  updateExecutive,
  createVisit,
  markAvailabilityBooked,
  markAvailabilityFree,
  updateVisitSchedule,
  cancelVisit
};
