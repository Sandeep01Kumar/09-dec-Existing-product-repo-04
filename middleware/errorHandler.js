/**
 * Security-Aware Error Handling Middleware
 * 
 * This middleware catches all errors in the Express application and returns
 * safe, sanitized error responses. It prevents information leakage by hiding
 * stack traces and internal error details in production mode while providing
 * verbose debugging information in development.
 * 
 * Security Features:
 * - Never exposes stack traces in production
 * - Never exposes internal error details for 5xx errors
 * - Uses generic messages for server errors to prevent information disclosure
 * - Logs all errors for server-side monitoring
 * 
 * @module middleware/errorHandler
 */

'use strict';

/**
 * Express error handling middleware that provides security-aware error responses.
 * 
 * Must have all 4 parameters (err, req, res, next) for Express to recognize
 * it as an error-handling middleware.
 * 
 * @param {Error} err - The error object caught by Express
 * @param {import('express').Request} req - The Express request object
 * @param {import('express').Response} res - The Express response object
 * @param {import('express').NextFunction} next - The Express next function (unused but required)
 * @returns {void}
 */
function errorHandler(err, req, res, next) {
  // Determine environment mode for response detail level
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  // Determine HTTP status code from error or default to 500
  const statusCode = err.status || err.statusCode || 500;
  
  // Determine if this is a client error (4xx) or server error (5xx)
  const isClientError = statusCode >= 400 && statusCode < 500;
  
  // Log error for server-side monitoring
  // Always log the error message, include stack trace in development
  if (isDevelopment) {
    console.error('[Error]', err.message);
    console.error('[Stack]', err.stack);
  } else {
    // In production, log concise error info without exposing internals to logs
    console.error('[Error]', `${statusCode} - ${err.message} - ${req.method} ${req.originalUrl}`);
  }
  
  // Build safe response object based on environment and error type
  let response;
  
  if (isDevelopment) {
    // Development mode: Include detailed error information for debugging
    response = {
      status: statusCode,
      message: err.message || 'An unexpected error occurred',
      error: err.message,
      stack: err.stack,
      path: req.originalUrl,
      method: req.method
    };
  } else {
    // Production mode: Sanitize response to prevent information leakage
    if (isClientError) {
      // For client errors (4xx), it's safe to expose the error message
      // as it typically describes what the client did wrong
      response = {
        status: statusCode,
        message: err.message || 'Bad request'
      };
    } else {
      // For server errors (5xx), use a generic message to prevent
      // exposing internal implementation details
      response = {
        status: statusCode,
        message: 'Internal server error'
      };
    }
  }
  
  // Ensure response headers haven't been sent already
  if (res.headersSent) {
    // If headers were already sent, delegate to Express's default error handler
    return next(err);
  }
  
  // Set JSON content type and send standardized error response
  res.status(statusCode).json(response);
}

// Export the error handler as the default export (CommonJS)
module.exports = errorHandler;
