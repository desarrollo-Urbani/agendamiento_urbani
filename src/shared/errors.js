class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

function asAppError(error) {
  if (error instanceof AppError) {
    return error;
  }

  return new AppError(error.message || 'Internal error', 500, 'INTERNAL_ERROR');
}

module.exports = {
  AppError,
  asAppError
};
