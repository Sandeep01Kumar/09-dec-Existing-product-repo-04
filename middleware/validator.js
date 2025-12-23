/**
 * Input Validation Middleware
 * 
 * Provides sanitization and validation middleware using express-validator.
 * Exports reusable validation chain factories and middleware functions
 * for validating user input on Express routes.
 * 
 * Implements OWASP A03:2021 - Injection prevention through input validation
 * and sanitization of all user-supplied data.
 * 
 * @module middleware/validator
 * @see {@link https://express-validator.github.io/docs/}
 */

'use strict';

const { body, query, param, validationResult, matchedData } = require('express-validator');

/**
 * Middleware to handle validation errors from express-validator chains.
 * Returns 400 Bad Request with validation error details when validation fails.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {void}
 * 
 * @example
 * app.post('/user', [
 *   body('email').isEmail(),
 *   handleValidationErrors
 * ], createUser);
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 400,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  
  next();
}

/**
 * Creates validation chain for string fields with common sanitization
 * 
 * @param {string} field - Name of the field to validate
 * @param {Object} [options={}] - Validation options
 * @param {number} [options.minLength=1] - Minimum string length
 * @param {number} [options.maxLength=255] - Maximum string length
 * @param {boolean} [options.required=true] - Whether field is required
 * @returns {ValidationChain} Express-validator validation chain
 */
function validateString(field, options = {}) {
  const { minLength = 1, maxLength = 255, required = true } = options;
  
  let chain = body(field).trim().escape();
  
  if (required) {
    chain = chain.notEmpty().withMessage(`${field} is required`);
  } else {
    chain = chain.optional();
  }
  
  return chain
    .isLength({ min: minLength, max: maxLength })
    .withMessage(`${field} must be between ${minLength} and ${maxLength} characters`);
}

/**
 * Creates validation chain for email fields
 * 
 * @param {string} field - Name of the email field to validate
 * @returns {ValidationChain} Express-validator validation chain
 */
function validateEmail(field) {
  return body(field)
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage(`${field} must be a valid email address`);
}

/**
 * Creates validation chain for numeric fields
 * 
 * @param {string} field - Name of the numeric field to validate
 * @param {Object} [options={}] - Validation options
 * @param {number} [options.min] - Minimum value
 * @param {number} [options.max] - Maximum value
 * @returns {ValidationChain} Express-validator validation chain
 */
function validateNumeric(field, options = {}) {
  const { min, max } = options;
  
  let chain = body(field).isNumeric().withMessage(`${field} must be a number`);
  
  if (min !== undefined) {
    chain = chain.custom(value => Number(value) >= min)
      .withMessage(`${field} must be at least ${min}`);
  }
  
  if (max !== undefined) {
    chain = chain.custom(value => Number(value) <= max)
      .withMessage(`${field} must be at most ${max}`);
  }
  
  return chain;
}

/**
 * Creates validation chain for optional fields with sanitization
 * 
 * @param {string} field - Name of the field to validate
 * @returns {ValidationChain} Express-validator validation chain
 */
function validateOptional(field) {
  return body(field).optional().trim().escape();
}

/**
 * Pre-configured middleware array for sanitizing query parameters
 */
const sanitizeQuery = [
  query('*').trim().escape()
];

/**
 * Pre-configured middleware array for sanitizing request body
 */
const sanitizeBody = [
  body('*').trim().escape()
];

module.exports = {
  handleValidationErrors,
  validateString,
  validateEmail,
  validateNumeric,
  validateOptional,
  sanitizeQuery,
  sanitizeBody,
  // Re-export express-validator functions for convenience
  body,
  query,
  param,
  validationResult,
  matchedData
};
