const { logError } = require('../logger');
const { ValidationError, ApiError } = require('../exceptions/validationError');

// Centralized error handling middleware
function errorMiddleware(err, req, res, next) {
  // Optionally log errors
  logError(err);

  // Handle ValidationError (field-level validation)
  if (err instanceof ValidationError) {
    return res.status(err.statusCode || 400).json({
      success: false,
      error: err.message,
      data: null
    });
  }

  // Handle ApiError (business logic, e.g., Email Already Exists)
  if (err instanceof ApiError) {
    return res.status(err.statusCode || 400).json({
      success: false,
      error: err.message,
      data: null
    });
  }

  // Fallback for all other errors
  return res.status(500).json({
    success: false,
    error: 'Internal server error',
    data: null
  });
}

module.exports = errorMiddleware;

