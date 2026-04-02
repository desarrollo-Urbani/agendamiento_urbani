const repo = require('../repositories/schedulingRepository');
const { AppError } = require('../shared/errors');

function getProjects() {
  return repo.listProjects();
}

function createProject(input) {
  return repo.inTransaction(() => {
    const projectResult = repo.createProject({
      name: input.name,
      attentionHours: input.attentionHours
    });
    const projectId = Number(projectResult.lastInsertRowid);

    repo.createExecutive({
      projectId,
      name: input.executiveName,
      email: input.executiveEmail
    });

    return { projectId };
  });
}

function updateProject(projectId, input) {
  const existingProject = repo.findProjectById(projectId);
  if (!existingProject) {
    throw new AppError('Project not found', 404, 'NOT_FOUND');
  }

  return repo.inTransaction(() => {
    repo.updateProject({
      projectId,
      name: input.name,
      attentionHours: input.attentionHours
    });

    if (input.executiveName) {
      const currentExecutive = repo.findPrimaryExecutiveByProjectId(projectId);
      if (currentExecutive) {
        repo.updateExecutive({
          executiveId: currentExecutive.id,
          name: input.executiveName,
          email: input.executiveEmail
        });
      } else {
        repo.createExecutive({
          projectId,
          name: input.executiveName,
          email: input.executiveEmail
        });
      }
    }

    return { success: true };
  });
}

function getExecutives(filters) {
  return repo.listExecutives(filters);
}

function getAvailability(filters) {
  return repo.listAvailability(filters);
}

function getVisits(filters) {
  return repo.listVisits(filters);
}

function getBlocks(filters) {
  return repo.listBlocks(filters);
}

function getCalendar(filters) {
  return repo.listCalendar(filters);
}

function bookVisit(input) {
  const project = repo.findProjectById(input.projectId);
  if (!project) {
    throw new AppError('Project not found', 404, 'NOT_FOUND');
  }

  const executive = repo.findExecutiveById(input.executiveId);
  if (!executive) {
    throw new AppError('Executive not found', 404, 'NOT_FOUND');
  }

  if (executive.project_id !== input.projectId) {
    throw new AppError('Executive does not belong to project', 400, 'VALIDATION_ERROR');
  }

  const slot = repo.findOpenAvailability(input.availabilityId, input.executiveId);
  if (!slot) {
    throw new AppError('Availability not found or already booked', 404, 'NOT_FOUND');
  }

  return repo.inTransaction(() => {
    const insertResult = repo.createVisit({
      projectId: input.projectId,
      executiveId: input.executiveId,
      availabilityId: input.availabilityId,
      clientName: input.clientName,
      clientEmail: input.clientEmail,
      startsAt: slot.slot_start,
      endsAt: slot.slot_end
    });

    repo.markAvailabilityBooked(input.availabilityId);
    return { visitId: Number(insertResult.lastInsertRowid) };
  });
}

function rescheduleVisit(input) {
  const visit = repo.findBookedVisit(input.visitId);
  if (!visit) {
    throw new AppError('Active visit not found', 404, 'NOT_FOUND');
  }

  const newSlot = repo.findOpenAvailability(input.newAvailabilityId, visit.executive_id);
  if (!newSlot) {
    throw new AppError('New availability not found or already booked', 404, 'NOT_FOUND');
  }

  return repo.inTransaction(() => {
    repo.markAvailabilityFree(visit.availability_id);
    repo.markAvailabilityBooked(input.newAvailabilityId);
    repo.updateVisitSchedule({
      visitId: input.visitId,
      availabilityId: input.newAvailabilityId,
      startsAt: newSlot.slot_start,
      endsAt: newSlot.slot_end
    });

    return { success: true };
  });
}

function cancelVisit(input) {
  const visit = repo.findBookedVisit(input.visitId);
  if (!visit) {
    throw new AppError('Active visit not found', 404, 'NOT_FOUND');
  }

  return repo.inTransaction(() => {
    repo.cancelVisit(input.visitId);
    repo.markAvailabilityFree(visit.availability_id);
    return { success: true };
  });
}

module.exports = {
  getProjects,
  createProject,
  updateProject,
  getExecutives,
  getAvailability,
  getVisits,
  getBlocks,
  getCalendar,
  bookVisit,
  rescheduleVisit,
  cancelVisit
};
