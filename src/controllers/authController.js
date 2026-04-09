const authService = require('../services/authService');
const authValidators = require('../validators/authValidators');

async function login(body, context) {
  const input = authValidators.validateLoginBody(body);
  return authService.login({
    ...input,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  });
}

async function loginByEmail(body, context) {
  const input = authValidators.validateEmailOnlyBody(body);
  return authService.loginByEmail({
    ...input,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  });
}

async function logout(sessionToken) {
  return authService.logout(sessionToken);
}

async function me(sessionToken) {
  const session = await authService.resolveSession(sessionToken);
  return session ? session.user : null;
}

async function changePassword(body, userId) {
  const input = authValidators.validateChangePasswordBody(body);
  return authService.changePassword({ userId, ...input });
}

async function requestPasswordReset(body, context) {
  const input = authValidators.validateRequestResetBody(body);
  return authService.requestPasswordReset({
    ...input,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  });
}

async function resetPassword(body) {
  const input = authValidators.validateResetPasswordBody(body);
  return authService.resetPassword(input);
}

async function listUsers(currentUser) {
  return authService.listUsersForAdmin(currentUser);
}

async function updateUserRole(body, currentUser, userId) {
  const input = authValidators.validateRoleChangeBody(body);
  return authService.updateUserRoleForAdmin({
    currentUser,
    userId,
    role: input.role
  });
}

module.exports = {
  login,
  loginByEmail,
  logout,
  me,
  changePassword,
  requestPasswordReset,
  resetPassword,
  listUsers,
  updateUserRole
};
