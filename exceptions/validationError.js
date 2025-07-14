class ValidationError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = statusCode;
    this.isOperational = true; // Indicates that this is an expected error
  }
}

class ApiError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.isOperational = true; // Indicates that this is an expected error
  }
}

module.exports = { ValidationError, ApiError };