const controller = require('../controllers/schedulingController');
const authController = require('../controllers/authController');
const authService = require('../services/authService');
const auditService = require('../services/auditService');
const validators = require('../validators/schedulingValidators');
const ENV = require('../config/env');
const { sendJson, readJsonBody, parseQuery } = require('../shared/http');
const { AppError } = require('../shared/errors');
const { parseCookies, serializeCookie } = require('../shared/cookies');

function getIpAddress(request) {
  const fwd = request.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return request.socket && request.socket.remoteAddress ? request.socket.remoteAddress : null;
}

async function buildContext(request) {
  const cookies = parseCookies(request.headers.cookie || '');
  const sessionToken = cookies[ENV.sessionCookieName] || null;
  const resolved = sessionToken ? await authService.resolveSession(sessionToken) : null;

  return {
    ipAddress: getIpAddress(request),
    userAgent: request.headers['user-agent'] || null,
    sessionToken,
    user: resolved ? resolved.user : null
  };
}

function requireAuth(context) {
  if (!context.user) {
    throw new AppError('Sesion no valida', 401, 'AUTH_REQUIRED');
  }
}

function requireAdmin(context) {
  requireAuth(context);
  if (context.user.role !== 'admin') {
    throw new AppError('Acceso restringido a administradores', 403, 'FORBIDDEN');
  }
}

async function handleApi(request, response, url) {
  const projectMatch = url.pathname.match(/^\/api\/projects\/(\d+)$/);
  const projectStatusMatch = url.pathname.match(/^\/api\/projects\/(\d+)\/status$/);
  const projectHistoryMatch = url.pathname.match(/^\/api\/projects\/(\d+)\/history$/);
  const adminUserRoleMatch = url.pathname.match(/^\/api\/admin\/users\/(\d+)\/role$/);

  const context = await buildContext(request);

  if (request.method === 'POST' && url.pathname === '/api/auth/login') {
    const body = await readJsonBody(request);
    try {
      const result = await authController.login(body, context);
      await auditService.logAudit({
        action: 'login',
        module: 'auth',
        entityType: 'session',
        entityId: result.user.id,
        description: 'Inicio de sesion exitoso',
        status: 'success',
        userId: result.user.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      });

      const cookie = serializeCookie(ENV.sessionCookieName, result.sessionToken, {
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
        secure: ENV.nodeEnv === 'production',
        maxAge: ENV.sessionTtlHours * 3600
      });

      response.setHeader('Set-Cookie', cookie);
      return sendJson(response, 200, { user: result.user });
    } catch (error) {
      await auditService.logAudit({
        action: 'failed_login',
        module: 'auth',
        entityType: 'session',
        entityId: null,
        description: `Intento fallido para ${body && body.email ? body.email : 'desconocido'}`,
        status: 'failed',
        userId: null,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      });
      throw error;
    }
  }

  if (request.method === 'POST' && url.pathname === '/api/auth/logout') {
    requireAuth(context);
    await authController.logout(context.sessionToken);
    await auditService.logAudit({
      action: 'logout',
      module: 'auth',
      entityType: 'session',
      entityId: context.user.id,
      description: 'Cierre de sesion',
      status: 'success',
      userId: context.user.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    response.setHeader('Set-Cookie', serializeCookie(ENV.sessionCookieName, '', { path: '/', maxAge: 0, sameSite: 'Lax' }));
    return sendJson(response, 200, { success: true });
  }

  if (request.method === 'GET' && url.pathname === '/api/auth/me') {
    if (!context.user) return sendJson(response, 200, { user: null });
    return sendJson(response, 200, { user: context.user });
  }

  if (request.method === 'POST' && url.pathname === '/api/auth/change-password') {
    requireAuth(context);
    const body = await readJsonBody(request);
    const result = await authController.changePassword(body, context.user.id);

    await auditService.logAudit({
      action: 'change_password',
      module: 'auth',
      entityType: 'user',
      entityId: context.user.id,
      description: 'Cambio de contrasena',
      status: 'success',
      userId: context.user.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    return sendJson(response, 200, result);
  }

  if (request.method === 'POST' && url.pathname === '/api/auth/request-password-reset') {
    const body = await readJsonBody(request);
    const result = await authController.requestPasswordReset(body, context);

    await auditService.logAudit({
      action: 'request_password_reset',
      module: 'auth',
      entityType: 'user',
      entityId: null,
      description: `Solicitud de recuperacion para ${body && body.email ? body.email : 'desconocido'}`,
      status: 'success',
      userId: null,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    return sendJson(response, 200, result);
  }

  if (request.method === 'POST' && url.pathname === '/api/auth/reset-password') {
    const body = await readJsonBody(request);
    const result = await authController.resetPassword(body);
    await auditService.logAudit({
      action: 'reset_password',
      module: 'auth',
      entityType: 'user',
      entityId: null,
      description: 'Restablecimiento de contrasena',
      status: 'success',
      userId: null,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });
    return sendJson(response, 200, result);
  }

  if (request.method === 'GET' && url.pathname === '/api/admin/users') {
    requireAdmin(context);
    const users = await authController.listUsers(context.user);
    return sendJson(response, 200, users);
  }

  if (request.method === 'PATCH' && adminUserRoleMatch) {
    requireAdmin(context);
    const body = await readJsonBody(request);
    const userId = Number(adminUserRoleMatch[1]);
    const result = await authController.updateUserRole(body, context.user, userId);

    await auditService.logAudit({
      userId: context.user.id,
      action: result.role === 'admin' ? 'grant_admin' : 'revoke_admin',
      module: 'users',
      entityType: 'user',
      entityId: result.id,
      description: `Cambio de rol a ${result.role} para ${result.email}`,
      newValues: { role: result.role },
      status: 'success',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    return sendJson(response, 200, result);
  }

  // Private API below
  requireAuth(context);

  if (request.method === 'GET' && url.pathname === '/api/projects') {
    return sendJson(response, 200, await controller.getProjects());
  }

  if (request.method === 'POST' && url.pathname === '/api/projects') {
    const body = await readJsonBody(request);
    const result = await controller.createProject(body);

    await auditService.logAudit({
      projectId: result.projectId,
      userId: context.user.id,
      action: 'create_project',
      module: 'projects',
      entityType: 'project',
      entityId: result.projectId,
      description: `Proyecto creado: ${body.name || ''}`,
      newValues: body,
      status: 'success',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    return sendJson(response, 201, result);
  }

  if (request.method === 'PUT' && projectMatch) {
    const body = await readJsonBody(request);
    const projectId = Number(projectMatch[1]);
    const result = await controller.updateProject(projectId, body);

    await auditService.logAudit({
      projectId,
      userId: context.user.id,
      action: 'update_project',
      module: 'projects',
      entityType: 'project',
      entityId: projectId,
      description: `Proyecto actualizado #${projectId}`,
      newValues: body,
      status: 'success',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    return sendJson(response, 200, result);
  }

  if (request.method === 'PATCH' && projectStatusMatch) {
    const projectId = Number(projectStatusMatch[1]);
    const body = await readJsonBody(request);
    const result = await controller.changeProjectStatus(projectId, body);

    await auditService.logAudit({
      projectId,
      userId: context.user.id,
      action: 'change_project_status',
      module: 'projects',
      entityType: 'project',
      entityId: projectId,
      description: `Cambio de estado de proyecto #${projectId}`,
      newValues: body,
      status: 'success',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    return sendJson(response, 200, result);
  }

  if (request.method === 'DELETE' && projectMatch) {
    const projectId = Number(projectMatch[1]);
    const result = await controller.deleteProject(projectId);

    await auditService.logAudit({
      projectId,
      userId: context.user.id,
      action: 'delete_project',
      module: 'projects',
      entityType: 'project',
      entityId: projectId,
      description: `Eliminacion logica de proyecto #${projectId}`,
      status: 'success',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    return sendJson(response, 200, result);
  }

  if (request.method === 'GET' && projectHistoryMatch) {
    const projectId = Number(projectHistoryMatch[1]);
    const filters = validators.validateAuditFilters(parseQuery(url));
    const history = await auditService.getProjectHistory(projectId, filters);
    return sendJson(response, 200, history);
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
    const result = await controller.setSlotStatus(body);

    await auditService.logAudit({
      projectId: body.projectId,
      userId: context.user.id,
      action: body.status === 'blocked' ? 'block_slot' : body.status === 'booked' ? 'book_slot' : 'release_slot',
      module: 'calendar',
      entityType: 'slot',
      entityId: `${body.projectId}:${body.startsAt}`,
      description: `Cambio de estado de bloque horario a ${body.status}`,
      newValues: body,
      status: 'success',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    return sendJson(response, 200, result);
  }

  if (request.method === 'POST' && url.pathname === '/api/book') {
    const body = await readJsonBody(request);
    const result = await controller.bookVisit(body);

    await auditService.logAudit({
      projectId: body.projectId,
      userId: context.user.id,
      action: 'create_visit',
      module: 'visits',
      entityType: 'visit',
      entityId: result.visitId,
      description: `Reserva creada para ${body.clientName || ''}`,
      newValues: body,
      status: 'success',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    return sendJson(response, 201, result);
  }

  if (request.method === 'PUT' && url.pathname === '/api/reschedule') {
    const body = await readJsonBody(request);
    const result = await controller.rescheduleVisit(body);

    await auditService.logAudit({
      userId: context.user.id,
      action: 'update_visit',
      module: 'visits',
      entityType: 'visit',
      entityId: body.visitId,
      description: `Reprogramacion de visita #${body.visitId}`,
      newValues: body,
      status: 'success',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    return sendJson(response, 200, result);
  }

  if (request.method === 'DELETE' && url.pathname === '/api/cancel') {
    const body = await readJsonBody(request);
    const result = await controller.cancelVisit(body);

    await auditService.logAudit({
      userId: context.user.id,
      action: 'delete_visit',
      module: 'visits',
      entityType: 'visit',
      entityId: body.visitId,
      description: `Cancelacion de visita #${body.visitId}`,
      newValues: body,
      status: 'success',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    return sendJson(response, 200, result);
  }

  return false;
}

module.exports = {
  handleApi
};
