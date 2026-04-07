const controller = require('../controllers/schedulingController');
const { sendJson, readJsonBody, parseQuery } = require('../shared/http');

async function handleApi(request, response, url) {
  const projectMatch = url.pathname.match(/^\/api\/projects\/(\d+)$/);

  if (request.method === 'GET' && url.pathname === '/api/projects') {
    return sendJson(response, 200, await controller.getProjects());
  }

  if (request.method === 'POST' && url.pathname === '/api/projects') {
    const body = await readJsonBody(request);
    return sendJson(response, 201, await controller.createProject(body));
  }

  if (request.method === 'PUT' && projectMatch) {
    const body = await readJsonBody(request);
    return sendJson(response, 200, await controller.updateProject(Number(projectMatch[1]), body));
  }

  if (request.method === 'GET' && url.pathname === '/api/executives') {
    return sendJson(response, 200, await controller.getExecutives(parseQuery(url)));
  }

  if (request.method === 'GET' && url.pathname === '/api/availability') {
    return sendJson(response, 200, await controller.getAvailability(parseQuery(url)));
  }

  if (request.method === 'GET' && url.pathname === '/api/visits') {
    return sendJson(response, 200, await controller.getVisits(parseQuery(url)));
  }

  if (request.method === 'GET' && url.pathname === '/api/blocks') {
    return sendJson(response, 200, await controller.getBlocks(parseQuery(url)));
  }

  if (request.method === 'GET' && url.pathname === '/api/calendar') {
    return sendJson(response, 200, await controller.getCalendar(parseQuery(url)));
  }

  if (request.method === 'POST' && url.pathname === '/api/calendar/slot-status') {
    const body = await readJsonBody(request);
    return sendJson(response, 200, await controller.setSlotStatus(body));
  }

  if (request.method === 'POST' && url.pathname === '/api/book') {
    const body = await readJsonBody(request);
    return sendJson(response, 201, await controller.bookVisit(body));
  }

  if (request.method === 'PUT' && url.pathname === '/api/reschedule') {
    const body = await readJsonBody(request);
    return sendJson(response, 200, await controller.rescheduleVisit(body));
  }

  if (request.method === 'DELETE' && url.pathname === '/api/cancel') {
    const body = await readJsonBody(request);
    return sendJson(response, 200, await controller.cancelVisit(body));
  }

  return false;
}

module.exports = {
  handleApi
};
