const pool = require('../db/connection');

async function q(sql, params, client) {
  return (client || pool).query(sql, params);
}

async function inTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw error;
  } finally {
    client.release();
  }
}

async function listProjects() {
  const { rows } = await q(
    `SELECT p.*, e.id AS manager_id, e.name AS manager_name, e.email AS manager_email
     FROM projects p
     LEFT JOIN executives e ON e.id = (
       SELECT id FROM executives ex
       WHERE ex.project_id = p.id
       ORDER BY ex.id ASC
       LIMIT 1
     )
     WHERE p.deleted_at IS NULL
     ORDER BY p.id ASC`,
    []
  );
  return rows;
}

async function listProjectScheduleRules(projectId, client) {
  const { rows } = await q(
    `SELECT * FROM project_schedule_rules WHERE project_id = $1 ORDER BY weekday ASC, start_time ASC`,
    [projectId],
    client
  );
  return rows;
}

async function listProjectDayBlocks(projectId, client) {
  const { rows } = await q(
    `SELECT * FROM project_day_blocks WHERE project_id = $1 ORDER BY block_date ASC, start_time ASC`,
    [projectId],
    client
  );
  return rows;
}

async function replaceProjectScheduleRules(projectId, scheduleRules, client) {
  await q('DELETE FROM project_schedule_rules WHERE project_id = $1', [projectId], client);
  if (!scheduleRules || scheduleRules.length === 0) return;
  for (const rule of scheduleRules) {
    await q(
      `INSERT INTO project_schedule_rules (project_id, weekday, start_time, end_time, slot_minutes)
       VALUES ($1, $2, $3, $4, $5)`,
      [projectId, rule.weekday, rule.startTime, rule.endTime, rule.slotMinutes],
      client
    );
  }
}

async function replaceProjectDayBlocks(projectId, dayBlocks, client) {
  await q('DELETE FROM project_day_blocks WHERE project_id = $1', [projectId], client);
  if (!dayBlocks || dayBlocks.length === 0) return;
  for (const block of dayBlocks) {
    await q(
      `INSERT INTO project_day_blocks (project_id, block_date, start_time, end_time, is_full_day, reason)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [projectId, block.blockDate, block.startTime || null, block.endTime || null, block.isFullDay ? 1 : 0, block.reason || null],
      client
    );
  }
}

async function createProject(input, client) {
  const { rows } = await q(
    `INSERT INTO projects (name, attention_hours) VALUES ($1, $2) RETURNING id`,
    [input.name, input.attentionHours],
    client
  );
  return rows[0];
}

async function updateProject(input, client) {
  await q(
    `UPDATE projects SET name = $1, attention_hours = $2, updated_at = NOW() WHERE id = $3`,
    [input.name, input.attentionHours, input.projectId],
    client
  );
}

async function updateProjectStatus(projectId, status, client) {
  await q(
    `UPDATE projects SET status = $1, updated_at = NOW() WHERE id = $2`,
    [status, projectId],
    client
  );
}

async function softDeleteProject(projectId, client) {
  await q(
    `UPDATE projects SET deleted_at = NOW(), status = 'deleted', updated_at = NOW() WHERE id = $1`,
    [projectId],
    client
  );
}

async function listExecutives(filters) {
  const conditions = ['1 = 1'];
  const params = [];
  if (filters.projectId) {
    params.push(filters.projectId);
    conditions.push(`e.project_id = $${params.length}`);
  }
  const { rows } = await q(
    `SELECT e.*, p.name AS project_name
     FROM executives e
     JOIN projects p ON p.id = e.project_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY e.name ASC`,
    params
  );
  return rows;
}

async function listAvailability(filters) {
  const conditions = ['a.is_booked = 0'];
  const params = [];
  if (filters.executiveId) {
    params.push(filters.executiveId);
    conditions.push(`a.executive_id = $${params.length}`);
  }
  if (filters.projectId) {
    params.push(filters.projectId);
    conditions.push(`e.project_id = $${params.length}`);
  }
  const { rows } = await q(
    `SELECT a.*, e.project_id
     FROM availability a
     JOIN executives e ON e.id = a.executive_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY a.slot_start ASC`,
    params
  );
  return rows;
}

async function listVisits(filters) {
  const conditions = ['1 = 1'];
  const params = [];
  if (filters.projectId) {
    params.push(filters.projectId);
    conditions.push(`v.project_id = $${params.length}`);
  }
  if (filters.from) {
    params.push(filters.from);
    conditions.push(`v.starts_at >= $${params.length}`);
  }
  if (filters.to) {
    params.push(filters.to);
    conditions.push(`v.ends_at <= $${params.length}`);
  }
  const { rows } = await q(
    `SELECT v.*, e.name AS executive_name, e.email AS executive_email, p.name AS project_name
     FROM visits v
     JOIN executives e ON e.id = v.executive_id
     JOIN projects p ON p.id = v.project_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY v.starts_at ASC`,
    params
  );
  return rows;
}

async function listBlocks(filters) {
  const conditions = ['1 = 1'];
  const params = [];
  if (filters.projectId) {
    params.push(filters.projectId);
    conditions.push(`e.project_id = $${params.length}`);
  }
  if (filters.from) {
    params.push(filters.from);
    conditions.push(`b.block_start >= $${params.length}`);
  }
  if (filters.to) {
    params.push(filters.to);
    conditions.push(`b.block_end <= $${params.length}`);
  }
  const { rows } = await q(
    `SELECT b.*, e.project_id, e.name AS executive_name
     FROM blocks b
     JOIN executives e ON e.id = b.executive_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY b.block_start ASC`,
    params
  );
  return rows;
}

async function listCalendar(filters) {
  function buildParams(projectCol, startCol, endCol) {
    const conds = ['1 = 1'];
    const vals = [];
    if (filters.projectId) { vals.push(filters.projectId); conds.push(`${projectCol} = $${vals.length}`); }
    if (filters.from)      { vals.push(filters.from);      conds.push(`${startCol} >= $${vals.length}`); }
    if (filters.to)        { vals.push(filters.to);        conds.push(`${endCol} <= $${vals.length}`); }
    return { where: conds.join(' AND '), vals };
  }
  const a = buildParams('e.project_id', 'a.slot_start', 'a.slot_end');
  const v = buildParams('v.project_id', 'v.starts_at', 'v.ends_at');
  const b = buildParams('e.project_id', 'b.block_start', 'b.block_end');

  const [aRes, vRes, bRes] = await Promise.all([
    q(`SELECT a.*, e.project_id, e.name AS executive_name FROM availability a JOIN executives e ON e.id = a.executive_id WHERE ${a.where} AND a.is_booked = 0 ORDER BY a.slot_start ASC`, a.vals),
    q(`SELECT v.*, e.name AS executive_name, e.email AS executive_email FROM visits v JOIN executives e ON e.id = v.executive_id WHERE ${v.where} ORDER BY v.starts_at ASC`, v.vals),
    q(`SELECT b.*, e.project_id, e.name AS executive_name FROM blocks b JOIN executives e ON e.id = b.executive_id WHERE ${b.where} ORDER BY b.block_start ASC`, b.vals)
  ]);
  return { availability: aRes.rows, visits: vRes.rows, blocks: bRes.rows };
}

async function listProjectDayBlocksInRange(filters) {
  const conditions = ['1 = 1'];
  const params = [];
  if (filters.projectId) {
    params.push(filters.projectId);
    conditions.push(`project_id = $${params.length}`);
  }
  if (filters.from) {
    params.push(filters.from.slice(0, 10));
    conditions.push(`block_date >= $${params.length}`);
  }
  if (filters.to) {
    params.push(filters.to.slice(0, 10));
    conditions.push(`block_date <= $${params.length}`);
  }
  const { rows } = await q(
    `SELECT * FROM project_day_blocks WHERE ${conditions.join(' AND ')} ORDER BY block_date ASC, start_time ASC`,
    params
  );
  return rows;
}

async function findConflictForSlot({ executiveId, startsAt, endsAt }, client) {
  const { rows: visitRows } = await q(
    `SELECT id FROM visits WHERE executive_id = $1 AND status = 'booked' AND starts_at < $3 AND ends_at > $2`,
    [executiveId, startsAt, endsAt],
    client
  );
  if (visitRows.length > 0) return visitRows[0];
  const { rows: blockRows } = await q(
    `SELECT id FROM blocks WHERE executive_id = $1 AND block_start < $3 AND block_end > $2`,
    [executiveId, startsAt, endsAt],
    client
  );
  return blockRows[0] || null;
}

async function createAvailability({ executiveId, slotStart, slotEnd, isBooked }, client) {
  const { rows } = await q(
    `INSERT INTO availability (executive_id, slot_start, slot_end, is_booked) VALUES ($1, $2, $3, $4) RETURNING *`,
    [executiveId, slotStart, slotEnd, isBooked ? 1 : 0],
    client
  );
  return rows[0];
}

async function findOpenAvailability(availabilityId, executiveId, client) {
  const { rows } = await q(
    'SELECT * FROM availability WHERE id = $1 AND executive_id = $2 AND is_booked = 0',
    [availabilityId, executiveId],
    client
  );
  return rows[0] || null;
}

async function findBookedVisit(visitId) {
  const { rows } = await q(
    `SELECT * FROM visits WHERE id = $1 AND status = 'booked'`,
    [visitId]
  );
  return rows[0] || null;
}

async function findProjectById(projectId) {
  const { rows } = await q('SELECT * FROM projects WHERE id = $1', [projectId]);
  return rows[0] || null;
}

async function findExecutiveById(executiveId) {
  const { rows } = await q('SELECT * FROM executives WHERE id = $1', [executiveId]);
  return rows[0] || null;
}

async function findPrimaryExecutiveByProjectId(projectId, client) {
  const { rows } = await q(
    `SELECT * FROM executives WHERE project_id = $1 ORDER BY id ASC LIMIT 1`,
    [projectId],
    client
  );
  return rows[0] || null;
}

async function createExecutive(input, client) {
  const { rows } = await q(
    `INSERT INTO executives (project_id, name, email) VALUES ($1, $2, $3) RETURNING id`,
    [input.projectId, input.name, input.email],
    client
  );
  return rows[0];
}

async function updateExecutive(input, client) {
  await q(
    `UPDATE executives SET name = $1, email = $2 WHERE id = $3`,
    [input.name, input.email, input.executiveId],
    client
  );
}

async function createVisit(input, client) {
  const { rows } = await q(
    `INSERT INTO visits (project_id, executive_id, availability_id, client_name, client_email, client_phone, client_rut, unit_to_visit, observation, starts_at, ends_at, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
    [input.projectId, input.executiveId, input.availabilityId, input.clientName, input.clientEmail, input.clientPhone || null, input.clientRut || null, input.unitToVisit, input.observation, input.startsAt, input.endsAt, input.status],
    client
  );
  return rows[0];
}

async function createBlock(input, client) {
  const { rows } = await q(
    `INSERT INTO blocks (executive_id, reason, block_start, block_end) VALUES ($1, $2, $3, $4) RETURNING id`,
    [input.executiveId, input.reason, input.blockStart, input.blockEnd],
    client
  );
  return rows[0];
}

async function findActiveVisitBySlot(input) {
  const { rows } = await q(
    `SELECT * FROM visits
     WHERE project_id = $1 AND executive_id = $2 AND starts_at = $3 AND ends_at = $4 AND status = 'booked'
     ORDER BY id DESC LIMIT 1`,
    [input.projectId, input.executiveId, input.startsAt, input.endsAt]
  );
  return rows[0] || null;
}

async function findBlockBySlot(input) {
  const { rows } = await q(
    `SELECT * FROM blocks
     WHERE executive_id = $1 AND block_start = $2 AND block_end = $3
     ORDER BY id DESC LIMIT 1`,
    [input.executiveId, input.blockStart, input.blockEnd]
  );
  return rows[0] || null;
}

async function updateVisitDetails(input, client) {
  await q(
    `UPDATE visits
     SET client_name = $1, client_email = $2, client_phone = $3, client_rut = $4, unit_to_visit = $5, observation = $6, status = $7, updated_at = NOW()
     WHERE id = $8`,
    [input.clientName, input.clientEmail, input.clientPhone || null, input.clientRut || null, input.unitToVisit, input.observation, input.status, input.visitId],
    client
  );
}

async function markAvailabilityBooked(availabilityId, client) {
  await q('UPDATE availability SET is_booked = 1 WHERE id = $1', [availabilityId], client);
}

async function markAvailabilityFree(availabilityId, client) {
  await q('UPDATE availability SET is_booked = 0 WHERE id = $1', [availabilityId], client);
}

async function updateVisitSchedule(input, client) {
  await q(
    `UPDATE visits SET availability_id = $1, starts_at = $2, ends_at = $3, updated_at = NOW() WHERE id = $4`,
    [input.availabilityId, input.startsAt, input.endsAt, input.visitId],
    client
  );
}

async function cancelVisit(visitId, client) {
  await q(
    `UPDATE visits SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
    [visitId],
    client
  );
}

async function deleteBlock(blockId, client) {
  await q('DELETE FROM blocks WHERE id = $1', [blockId], client);
}

module.exports = {
  inTransaction,
  listProjects,
  listProjectScheduleRules,
  listProjectDayBlocks,
  replaceProjectScheduleRules,
  replaceProjectDayBlocks,
  createProject,
  updateProject,
  updateProjectStatus,
  softDeleteProject,
  listExecutives,
  listAvailability,
  listVisits,
  listBlocks,
  listCalendar,
  listProjectDayBlocksInRange,
  findOpenAvailability,
  findBookedVisit,
  findProjectById,
  findExecutiveById,
  findPrimaryExecutiveByProjectId,
  createExecutive,
  updateExecutive,
  createVisit,
  createBlock,
  findActiveVisitBySlot,
  findBlockBySlot,
  updateVisitDetails,
  markAvailabilityBooked,
  markAvailabilityFree,
  updateVisitSchedule,
  cancelVisit,
  deleteBlock,
  findConflictForSlot,
  createAvailability
};
