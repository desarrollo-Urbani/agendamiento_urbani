const controller = require('../controllers/schedulingController');
const authController = require('../controllers/authController');
const authService = require('../services/authService');
const auditService = require('../services/auditService');
const supabaseAdminService = require('../services/supabaseAdminService');
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

function getBearerToken(request) {
  const header = request.headers.authorization || '';
  if (!header.toLowerCase().startsWith('bearer ')) return null;
  return header.slice(7).trim();
}

async function buildContext(request) {
  const accessToken = getBearerToken(request);
  const cookies = parseCookies(request.headers.cookie || '');
  const sessionToken = cookies[ENV.sessionCookieName] || null;
  const resolvedByToken = accessToken ? await authService.resolveAccessToken(accessToken) : null;
  const resolvedBySession = !resolvedByToken && sessionToken ? await authService.resolveSession(sessionToken) : null;
  const resolved = resolvedByToken || resolvedBySession;

  return {
    ipAddress: getIpAddress(request),
    userAgent: request.headers['user-agent'] || null,
    accessToken,
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

function normalizedRole(user) {
  if (!user || !user.role) return null;
  const role = String(user.role).toLowerCase();
  if (role === 'executive') return 'usuario';
  return role;
}

function requireRoles(context, allowedRoles) {
  requireAuth(context);
  const role = normalizedRole(context.user);
  if (!allowedRoles.includes(role)) {
    throw new AppError('No tienes permisos para esta accion', 403, 'FORBIDDEN');
  }
}

async function handleApi(request, response, url) {
  const projectMatch = url.pathname.match(/^\/api\/projects\/(\d+)$/);
  const projectStatusMatch = url.pathname.match(/^\/api\/projects\/(\d+)\/status$/);
  const projectHistoryMatch = url.pathname.match(/^\/api\/projects\/(\d+)\/history$/);
  const adminUserRoleMatch = url.pathname.match(/^\/api\/admin\/users\/(\d+)\/role$/);
  const adminSupabaseUserMatch = url.pathname.match(/^\/api\/admin\/supabase-users\/([^/]+)$/);
  const adminSupabaseUserPasswordMatch = url.pathname.match(/^\/api\/admin\/supabase-users\/([^/]+)\/password$/);

  const context = await buildContext(request);

  if (request.method === 'POST' && url.pathname === '/api/auth/login') {
    return sendJson(response, 410, { error: 'Login con clave deshabilitado temporalmente. Usa ingreso por correo.' });
  }

  if (request.method === 'POST' && url.pathname === '/api/auth/login-email') {
    const body = await readJsonBody(request);
    const result = await authController.loginByEmail(body, context);

    await auditService.logAudit({
      action: 'login',
      module: 'auth',
      entityType: 'session',
      entityId: result.user.id,
      description: 'Inicio de sesion por correo (sin clave)',
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
  }

  if (request.method === 'POST' && url.pathname === '/api/auth/logout') {
    requireAuth(context);
    if (context.sessionToken) {
      await authController.logout(context.sessionToken);
    }
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
    return sendJson(response, 410, { error: 'Cambio local deshabilitado: use Supabase Auth' });
  }

  if (request.method === 'POST' && url.pathname === '/api/auth/request-password-reset') {
    const body = await readJsonBody(request);
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
    return sendJson(response, 200, { success: true });
  }

  if (request.method === 'POST' && url.pathname === '/api/auth/reset-password') {
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
    return sendJson(response, 200, { success: true });
  }

  if (request.method === 'POST' && url.pathname === '/api/auth/sync') {
    if (!context.user && context.accessToken) {
      const resolved = await authService.resolveAccessToken(context.accessToken);
      context.user = resolved.user;
    }
    requireAuth(context);
    await auditService.logAudit({
      action: 'login',
      module: 'auth',
      entityType: 'session',
      entityId: context.user.id,
      description: 'Inicio de sesion exitoso (Supabase)',
      status: 'success',
      userId: context.user.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });
    return sendJson(response, 200, { user: context.user });
  }

  if (request.method === 'POST' && url.pathname === '/api/auth/failed-login') {
    const body = await readJsonBody(request);
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
    return sendJson(response, 200, { success: true });
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

  if (request.method === 'GET' && url.pathname === '/api/admin/supabase-users') {
    requireAdmin(context);
    const users = await supabaseAdminService.listUsers();
    return sendJson(response, 200, users);
  }

  if (request.method === 'POST' && url.pathname === '/api/admin/supabase-users') {
    requireAdmin(context);
    const body = await readJsonBody(request);
    const email = String(body && body.email ? body.email : '').trim().toLowerCase();
    const password = String(body && body.password ? body.password : '');
    const displayName = String(body && body.displayName ? body.displayName : '').trim();
    const role = String(body && body.role ? body.role : 'executive').trim().toLowerCase();
    if (!['admin', 'usuario', 'lector', 'executive'].includes(role)) {
      throw new AppError('Rol invalido', 400, 'VALIDATION_ERROR');
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AppError('Email invalido', 400, 'VALIDATION_ERROR');
    }
    if (password.length < 8) {
      throw new AppError('La contrasena debe tener al menos 8 caracteres', 400, 'VALIDATION_ERROR');
    }

    const created = await supabaseAdminService.createUser({
      email,
      password,
      displayName: displayName || email,
      role
    });

    await auditService.logAudit({
      userId: context.user.id,
      action: 'create_supabase_user',
      module: 'auth',
      entityType: 'user',
      entityId: created.id,
      description: `Usuario Supabase creado: ${created.email}`,
      newValues: { email: created.email, role: created.role },
      status: 'success',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    return sendJson(response, 201, created);
  }

  if (request.method === 'DELETE' && adminSupabaseUserMatch) {
    requireAdmin(context);
    const userId = decodeURIComponent(adminSupabaseUserMatch[1]);
    await supabaseAdminService.deleteUserById(userId);

    await auditService.logAudit({
      userId: context.user.id,
      action: 'delete_supabase_user',
      module: 'auth',
      entityType: 'user',
      entityId: userId,
      description: `Usuario Supabase eliminado: ${userId}`,
      status: 'success',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    return sendJson(response, 200, { success: true });
  }

  if (request.method === 'POST' && adminSupabaseUserPasswordMatch) {
    requireAdmin(context);
    const userId = decodeURIComponent(adminSupabaseUserPasswordMatch[1]);
    const body = await readJsonBody(request);
    const password = String(body && body.password ? body.password : '');
    if (password.length < 8) {
      throw new AppError('La contrasena debe tener al menos 8 caracteres', 400, 'VALIDATION_ERROR');
    }

    await supabaseAdminService.updateUserPassword(userId, password);

    await auditService.logAudit({
      userId: context.user.id,
      action: 'update_supabase_password',
      module: 'auth',
      entityType: 'user',
      entityId: userId,
      description: `Contrasena actualizada en Supabase para ${userId}`,
      status: 'success',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    return sendJson(response, 200, { success: true });
  }

  // Private API below
  requireAuth(context);

  if (request.method === 'GET' && url.pathname === '/api/projects') {
    requireRoles(context, ['admin', 'usuario', 'lector']);
    return sendJson(response, 200, await controller.getProjects());
  }

  if (request.method === 'POST' && url.pathname === '/api/projects') {
    requireAdmin(context);
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
    requireAdmin(context);
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
    requireAdmin(context);
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
    requireAdmin(context);
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

  if (request.method === 'GET' && url.pathname === '/api/logs') {
    requireRoles(context, ['admin', 'usuario']);
    const filters = validators.validateAuditFilters(parseQuery(url));
    // Si no es admin, solo ve sus propios eventos.
    if (normalizedRole(context.user) !== 'admin') {
      filters.userId = context.user.id;
    }
    const rows = await auditService.getAuditLogs(filters);
    return sendJson(response, 200, rows);
  }

  if (request.method === 'GET' && url.pathname === '/api/executives') {
    requireRoles(context, ['admin', 'usuario', 'lector']);
    return sendJson(response, 200, await controller.getExecutives(parseQuery(url)));
  }

  if (request.method === 'GET' && url.pathname === '/api/availability') {
    requireRoles(context, ['admin', 'usuario', 'lector']);
    return sendJson(response, 200, await controller.getAvailability(parseQuery(url)));
  }

  if (request.method === 'GET' && url.pathname === '/api/visits') {
    requireRoles(context, ['admin', 'usuario', 'lector']);
    const filters = parseQuery(url);
    const role = normalizedRole(context.user);
    if (role === 'usuario') {
      filters.creatorUserId = context.user.id;
    }
    if (role === 'lector' && !filters.projectId) {
      throw new AppError('Debes seleccionar un proyecto para consultar citas', 400, 'VALIDATION_ERROR');
    }
    return sendJson(response, 200, await controller.getVisits(filters));
  }

  if (request.method === 'GET' && url.pathname === '/api/me/today-visits') {
    const summary = await controller.getMyTodayVisitsSummary(context.user);
    await auditService.logAudit({
      projectId: summary.projectId,
      userId: context.user.id,
      action: 'view_today_visits_summary',
      module: 'dashboard',
      entityType: 'visit',
      entityId: String(summary.date),
      description: 'Consulta de alerta superior de visitas del dia',
      newValues: summary,
      status: 'success',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });
    return sendJson(response, 200, summary);
  }

  if (request.method === 'GET' && url.pathname === '/api/blocks') {
    requireRoles(context, ['admin', 'usuario', 'lector']);
    return sendJson(response, 200, await controller.getBlocks(parseQuery(url)));
  }

  if (request.method === 'GET' && url.pathname === '/api/calendar') {
    requireRoles(context, ['admin', 'usuario', 'lector']);
    const query = parseQuery(url);
    const role = normalizedRole(context.user);
    if (role === 'usuario') {
      query.creatorUserId = context.user.id;
    }
    if (role === 'lector' && !query.projectId) {
      throw new AppError('Debes seleccionar un proyecto para consultar calendario', 400, 'VALIDATION_ERROR');
    }
    const calendar = await controller.getCalendar(query);
    await auditService.logAudit({
      projectId: query.projectId ? Number(query.projectId) : null,
      userId: context.user.id,
      action: 'view_calendar_states',
      module: 'calendar',
      entityType: 'state',
      entityId: query.projectId || 'all-projects',
      description: 'Consulta de estados del calendario',
      newValues: {
        projectId: query.projectId || null,
        from: query.from || null,
        to: query.to || null,
        availabilityCount: calendar.availability.length,
        visitsCount: calendar.visits.length,
        blockedCount: calendar.blocks.length
      },
      status: 'success',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });
    return sendJson(response, 200, calendar);
  }

  if (request.method === 'POST' && url.pathname === '/api/calendar/slot-status') {
    requireAdmin(context);
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
    requireRoles(context, ['admin', 'usuario']);
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
    requireRoles(context, ['admin', 'usuario']);
    const body = await readJsonBody(request);
    if (normalizedRole(context.user) === 'usuario') {
      const canManage = await controller.canUserManageVisit(body.visitId, context.user.id);
      if (!canManage) {
        throw new AppError('Solo puedes reprogramar citas creadas por tu usuario', 403, 'FORBIDDEN');
      }
    }
    const result = await controller.rescheduleVisit(body);

    await auditService.logAudit({
      userId: context.user.id,
      action: 'update_visit',
      module: 'visits',
      entityType: 'visit',
      entityId: body.visitId,
      description: `Reprogramacion de visita #${body.visitId}`,
      oldValues: { visitId: body.visitId, previousAvailabilityId: body.previousAvailabilityId || null },
      newValues: body,
      status: 'success',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    return sendJson(response, 200, result);
  }

  if (request.method === 'DELETE' && url.pathname === '/api/cancel') {
    requireRoles(context, ['admin', 'usuario']);
    const body = await readJsonBody(request);
    if (normalizedRole(context.user) === 'usuario') {
      const canManage = await controller.canUserManageVisit(body.visitId, context.user.id);
      if (!canManage) {
        throw new AppError('Solo puedes cancelar citas creadas por tu usuario', 403, 'FORBIDDEN');
      }
    }
    const result = await controller.cancelVisit(body);

    await auditService.logAudit({
      userId: context.user.id,
      action: 'delete_visit',
      module: 'visits',
      entityType: 'visit',
      entityId: body.visitId,
      description: `Cancelacion de visita #${body.visitId}`,
      oldValues: { visitId: body.visitId, status: 'booked' },
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
