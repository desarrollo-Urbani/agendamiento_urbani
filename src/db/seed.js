const db = require('./connection');

function pad(number) {
  return String(number).padStart(2, '0');
}

function toIsoLocal(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

function makeHourlySlots(ranges) {
  const slots = [];
  ranges.forEach(([startHour, endHour]) => {
    for (let hour = startHour; hour < endHour; hour += 1) {
      slots.push([hour, 0]);
    }
  });
  return slots;
}

function scheduleSlotsByDay(scheduleId, day) {
  const isMon = day === 1;
  const isTue = day === 2;
  const isWed = day === 3;
  const isThu = day === 4;
  const isFri = day === 5;
  const isSat = day === 6;
  const isSun = day === 0;

  const slots10to14And15to18 = makeHourlySlots([[10, 14], [15, 18]]);

  if (scheduleId === 'TUE_SUN_10_14_15_18') {
    return (isTue || isWed || isThu || isFri || isSat || isSun) ? slots10to14And15to18 : [];
  }

  if (scheduleId === 'MON_THU_10_14_15_18_FRI_10_13') {
    if (isMon || isTue || isWed || isThu) {
      return slots10to14And15to18;
    }
    if (isFri) {
      return makeHourlySlots([[10, 13]]);
    }
    return [];
  }

  if (scheduleId === 'MON_SUN_10_14_15_18') {
    return slots10to14And15to18;
  }

  if (scheduleId === 'MON_SUN_11_14_15_19') {
    return makeHourlySlots([[11, 14], [15, 19]]);
  }

  if (scheduleId === 'MON_FRI_10_14_15_18') {
    return (isMon || isTue || isWed || isThu || isFri) ? slots10to14And15to18 : [];
  }

  return [];
}

try {
  db.exec('BEGIN');

  db.exec('DELETE FROM visits;');
  db.exec('DELETE FROM blocks;');
  db.exec('DELETE FROM availability;');
  db.exec('DELETE FROM executives;');
  db.exec('DELETE FROM projects;');
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('projects','executives','availability','visits','blocks');");

  const projectsData = [
    {
      name: 'New Cycle',
      typologies: 'Deptos Estudio, 1 y 2 dormitorios',
      deliveryDate: 'Primer semestre 2024',
      salesOfficeAddress: 'Orompello 1061, Concepcion',
      attentionHours: 'Martes a Domingo 10:00 a 14:00 y 15:00 a 18:00',
      scheduleId: 'TUE_SUN_10_14_15_18'
    },
    {
      name: 'Pelantaro',
      typologies: 'Deptos Estudio, 1 y 2 dormitorios',
      deliveryDate: 'Primer semestre 2024',
      salesOfficeAddress: 'Pelantaro 637, Concepcion',
      attentionHours: 'Martes a Domingo 10:00 a 14:00 y 15:00 a 18:00',
      scheduleId: 'TUE_SUN_10_14_15_18'
    },
    {
      name: 'Espacio Heras',
      typologies: 'Deptos Estudio, 1 y 2 dormitorios',
      deliveryDate: 'Segundo semestre 2025',
      salesOfficeAddress: 'Cochrane 635, Torre B, Oficina 903, Concepcion',
      attentionHours: 'Lunes a Jueves 10:00 a 14:00 y 15:00 a 18:00. Viernes 10:00 a 13:00',
      scheduleId: 'MON_THU_10_14_15_18_FRI_10_13'
    },
    {
      name: 'Pie de Monte',
      typologies: 'Deptos 1 y 2 dormitorios',
      deliveryDate: 'Segundo semestre 2024',
      salesOfficeAddress: 'Ruta 160 #2755, San Pedro de la Paz',
      attentionHours: 'Lunes a Domingo 10:00 a 14:00 y 15:00 a 18:00',
      scheduleId: 'MON_SUN_10_14_15_18'
    },
    {
      name: 'Las Bandurrias',
      typologies: 'Casas de 2 y 3 dormitorios',
      deliveryDate: 'Primer semestre 2025',
      salesOfficeAddress: 'Cochrane 635, Torre B, Oficina 903, Concepcion',
      attentionHours: 'Lunes a Jueves 10:00 a 14:00 y 15:00 a 18:00. Viernes 10:00 a 13:00',
      scheduleId: 'MON_THU_10_14_15_18_FRI_10_13'
    },
    {
      name: 'Terralta',
      typologies: 'Deptos 2 y 3 dormitorios',
      deliveryDate: 'Primer semestre 2024',
      salesOfficeAddress: 'Camino el venado 1745, Andalue',
      attentionHours: 'Lunes a Domingo 11:00 a 14:00 y 15:00 a 19:00',
      scheduleId: 'MON_SUN_11_14_15_19'
    },
    {
      name: 'Plaza El Roble',
      typologies: 'Deptos 1, 2 y 3 dormitorios',
      deliveryDate: 'Segundo semestre 2025',
      salesOfficeAddress: 'Arauco 329, Chillan',
      attentionHours: 'Lunes a Viernes 10:00 a 14:00 y 15:00 a 18:00',
      scheduleId: 'MON_FRI_10_14_15_18'
    },
    {
      name: 'Plaza Bilbao (Subsidio DS19)',
      typologies: 'Casas de 3 dormitorios',
      deliveryDate: 'Entrega inmediata',
      salesOfficeAddress: 'Francisco Bilbao 0500, San Carlos',
      attentionHours: 'Lunes a Viernes 10:00 a 14:00 y 15:00 a 18:00',
      scheduleId: 'MON_FRI_10_14_15_18'
    },
    {
      name: 'Parque Cordillera II (Subsidio DS19)',
      typologies: 'Casas de 2 y 3 dormitorios',
      deliveryDate: 'Primer semestre 2024',
      salesOfficeAddress: 'Arauco 329, Chillan',
      attentionHours: 'Lunes a Viernes 10:00 a 14:00 y 15:00 a 18:00',
      scheduleId: 'MON_FRI_10_14_15_18'
    },
    {
      name: 'Los Normandos II',
      typologies: 'Casas de 2 y 3 dormitorios',
      deliveryDate: 'Segundo semestre 2024',
      salesOfficeAddress: 'Av. Lauquen esquina Petrohue, Los Angeles',
      attentionHours: 'Lunes a Viernes 10:00 a 14:00 y 15:00 a 18:00',
      scheduleId: 'MON_FRI_10_14_15_18'
    },
    {
      name: 'Deptos con Subsidio DS19',
      typologies: 'Deptos 2 y 3 dormitorios',
      deliveryDate: 'Segundo semestre 2025',
      salesOfficeAddress: 'Avenida Lauquen esquina Petrohue, Los Angeles',
      attentionHours: 'Lunes a Viernes 10:00 a 14:00 y 15:00 a 18:00',
      scheduleId: 'MON_FRI_10_14_15_18'
    }
  ];

  const insertProject = db.prepare(
    `INSERT INTO projects (name, typologies, delivery_date, sales_office_address, attention_hours)
     VALUES (?, ?, ?, ?, ?)`
  );
  const projectRows = projectsData.map((project) => {
    const result = insertProject.run(
      project.name,
      project.typologies,
      project.deliveryDate,
      project.salesOfficeAddress,
      project.attentionHours
    );
    return {
      id: Number(result.lastInsertRowid),
      ...project
    };
  });

  const firstNames = ['Ana', 'Luis', 'Carla', 'Diego', 'Sofia', 'Matias', 'Fernanda', 'Rocio', 'Javier', 'Camila', 'Tomas'];
  const lastNames = ['Torres', 'Rojas', 'Mena', 'Perez', 'Castillo', 'Lopez', 'Ruiz', 'Vega', 'Morales', 'Soto', 'Gonzalez'];
  const insertExecutive = db.prepare(
    'INSERT INTO executives (project_id, name, email) VALUES (?, ?, ?)'
  );

  const executiveRows = projectRows.map((project, index) => {
    const firstName = firstNames[index % firstNames.length];
    const lastName = lastNames[index % lastNames.length];
    const execName = `${firstName} ${lastName}`;
    const result = insertExecutive.run(
      project.id,
      execName,
      `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index + 1}@urbani.cl`
    );

    return {
      id: Number(result.lastInsertRowid),
      projectId: project.id,
      projectName: project.name,
      scheduleId: project.scheduleId
    };
  });

  const availabilitySlots = [];
  const insertAvailability = db.prepare(
    'INSERT INTO availability (executive_id, slot_start, slot_end, is_booked) VALUES (?, ?, ?, 0)'
  );

  for (let dayOffset = 0; dayOffset < 14; dayOffset += 1) {
    executiveRows.forEach((executive) => {
      const dateRef = new Date(2026, 3, 1 + dayOffset, 0, 0, 0, 0);
      const daySlots = scheduleSlotsByDay(executive.scheduleId, dateRef.getDay());

      daySlots.forEach(([hour, minute]) => {
        const slotStartDate = new Date(2026, 3, 1 + dayOffset, hour, minute, 0, 0);
        const slotEndDate = addMinutes(slotStartDate, 60);
        const slotStart = toIsoLocal(slotStartDate);
        const slotEnd = toIsoLocal(slotEndDate);
        const insertResult = insertAvailability.run(executive.id, slotStart, slotEnd);

        availabilitySlots.push({
          id: Number(insertResult.lastInsertRowid),
          executiveId: executive.id,
          projectId: executive.projectId,
          slotStart,
          slotEnd
        });
      });
    });
  }

  const bookedSlots = availabilitySlots.filter((_, index) => index % 2 === 0).slice(0, 50);

  const visitFirstNames = ['Matias', 'Fernanda', 'Rocio', 'Javier', 'Camila', 'Tomas', 'Paula', 'Cristobal', 'Daniela', 'Ignacio'];
  const visitLastNames = ['Lopez', 'Ruiz', 'Vega', 'Morales', 'Soto', 'Gonzalez', 'Munoz', 'Contreras', 'Diaz', 'Silva'];

  const insertVisit = db.prepare(
    `INSERT INTO visits (project_id, executive_id, availability_id, client_name, client_email, starts_at, ends_at, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'booked')`
  );
  const markBooked = db.prepare('UPDATE availability SET is_booked = 1 WHERE id = ?');

  bookedSlots.forEach((slot, index) => {
    const firstName = visitFirstNames[index % visitFirstNames.length];
    const lastName = visitLastNames[index % visitLastNames.length];
    const fullName = `${firstName} ${lastName} ${index + 1}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index + 1}@mail.com`;

    insertVisit.run(
      slot.projectId,
      slot.executiveId,
      slot.id,
      fullName,
      email,
      slot.slotStart,
      slot.slotEnd
    );
    markBooked.run(slot.id);
  });

  db.exec(`
    INSERT INTO blocks (executive_id, reason, block_start, block_end)
    VALUES
      (1, 'Capacitacion interna', '2026-04-02T14:00:00', '2026-04-02T15:00:00'),
      (2, 'Reunion comercial', '2026-04-03T13:00:00', '2026-04-03T14:00:00'),
      (3, 'Colacion', '2026-04-04T13:00:00', '2026-04-04T14:00:00'),
      (4, 'Salida a terreno', '2026-04-05T10:00:00', '2026-04-05T11:30:00'),
      (5, 'Comite de ventas', '2026-04-06T11:00:00', '2026-04-06T12:00:00');
  `);

  db.exec('COMMIT');
  console.log('Seed completed successfully with 50 booked visits.');
} catch (error) {
  try {
    db.exec('ROLLBACK');
  } catch (_rollbackError) {
    // ignore rollback errors
  }
  console.error('Seed failed:', error.message);
  process.exitCode = 1;
} finally {
  db.close();
}


