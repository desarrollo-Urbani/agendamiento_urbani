const service = require('../services/schedulingService');
const validators = require('../validators/schedulingValidators');

function getProjects() {
  return service.getProjects();
}

function createProject(body) {
  const input = validators.validateCreateProjectBody(body);
  return service.createProject(input);
}

function updateProject(projectId, body) {
  const input = validators.validateUpdateProjectBody(body);
  return service.updateProject(projectId, input);
}

function getExecutives(query) {
  const filters = validators.validateExecutiveFilters(query);
  return service.getExecutives(filters);
}

function getAvailability(query) {
  const filters = validators.validateAvailabilityFilters(query);
  return service.getAvailability(filters);
}

function getVisits(query) {
  const filters = validators.validateCalendarFilters(query);
  return service.getVisits(filters);
}

function getBlocks(query) {
  const filters = validators.validateCalendarFilters(query);
  return service.getBlocks(filters);
}

function getCalendar(query) {
  const filters = validators.validateCalendarFilters(query);
  return service.getCalendar(filters);
}

function bookVisit(body) {
  const input = validators.validateBookBody(body);
  return service.bookVisit(input);
}

function rescheduleVisit(body) {
  const input = validators.validateRescheduleBody(body);
  return service.rescheduleVisit(input);
}

function cancelVisit(body) {
  const input = validators.validateCancelBody(body);
  return service.cancelVisit(input);
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
