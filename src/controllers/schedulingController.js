const service = require('../services/schedulingService');
const validators = require('../validators/schedulingValidators');

async function getProjects() {
  return service.getProjects();
}

async function createProject(body) {
  const input = validators.validateCreateProjectBody(body);
  return service.createProject(input);
}

async function updateProject(projectId, body) {
  const input = validators.validateUpdateProjectBody(body);
  return service.updateProject(projectId, input);
}

async function changeProjectStatus(projectId, body) {
  const input = validators.validateProjectStatusBody(body);
  return service.changeProjectStatus(projectId, input);
}

async function deleteProject(projectId) {
  return service.deleteProject(projectId);
}

async function getExecutives(query) {
  const filters = validators.validateExecutiveFilters(query);
  return service.getExecutives(filters);
}

async function getAvailability(query) {
  const filters = validators.validateAvailabilityFilters(query);
  return service.getAvailability(filters);
}

async function getVisits(query) {
  const filters = validators.validateCalendarFilters(query);
  return service.getVisits(filters);
}

async function getBlocks(query) {
  const filters = validators.validateCalendarFilters(query);
  return service.getBlocks(filters);
}

async function getCalendar(query) {
  const filters = validators.validateCalendarFilters(query);
  return service.getCalendar(filters);
}

async function bookVisit(body) {
  const input = validators.validateBookBody(body);
  return service.bookVisit(input);
}

async function rescheduleVisit(body) {
  const input = validators.validateRescheduleBody(body);
  return service.rescheduleVisit(input);
}

async function cancelVisit(body) {
  const input = validators.validateCancelBody(body);
  return service.cancelVisit(input);
}

async function setSlotStatus(body) {
  const input = validators.validateSlotStatusBody(body);
  return service.setSlotStatus(input);
}

module.exports = {
  getProjects,
  createProject,
  updateProject,
  changeProjectStatus,
  deleteProject,
  getExecutives,
  getAvailability,
  getVisits,
  getBlocks,
  getCalendar,
  bookVisit,
  rescheduleVisit,
  cancelVisit,
  setSlotStatus
};
