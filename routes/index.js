/**
 * Express Route Definitions
 * 
 * Defines all application endpoints using express.Router().
 * Implements the main Hello World endpoint preserving backward compatibility
 * with the original server.js behavior.
 * 
 * @module routes/index
 */

'use strict';

const express = require('express');
const { body } = require('express-validator');
const { handleValidationErrors, validateString } = require('../middleware/validator');

const router = express.Router();

/**
 * GET /
 * Main Hello World endpoint - preserves backward compatibility with original server.js
 * 
 * Original behavior (server.js lines 6-10):
 *   res.statusCode = 200;
 *   res.setHeader('Content-Type', 'text/plain');
 *   res.end('Hello, World!\n');
 * 
 * @returns {string} 'Hello, World!\n' with Content-Type: text/plain
 */
router.get('/', (req, res) => {
  res.status(200).type('text/plain').send('Hello, World!\n');
});

/**
 * GET /good-evening
 * Returns a plain-text evening greeting (feature F-016).
 * Mirrors the GET / response convention, including the trailing newline.
 *
 * @returns {string} 'Good evening\n' with Content-Type: text/plain
 */
router.get('/good-evening', (req, res) => {                  // register GET /good-evening on the shared router
  res.status(200).type('text/plain').send('Good evening\n'); // respond 200 with a text/plain evening greeting
});

/**
 * GET /health
 * Health check endpoint for load balancers and monitoring systems
 * Skipped by rate limiter (see config/security.js rateLimitConfig.skip)
 * 
 * @returns {Object} JSON response with status and timestamp
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: Date.now()
  });
});

/**
 * POST /echo
 * Example endpoint demonstrating input validation middleware integration
 * Echoes back the validated and sanitized message from request body
 * 
 * Uses validateString() from middleware/validator.js for consistent
 * string validation with automatic trim, escape, and length validation.
 * Uses body() from express-validator for additional field validation.
 * 
 * @param {string} req.body.message - Message to echo back (required, 1-500 chars)
 * @param {string} [req.body.name] - Optional name field for demonstration
 * @returns {Object} JSON response with validated message
 */
router.post('/echo',
  [
    // Use validateString from validator middleware for message field
    // Demonstrates reusable validation chain factory pattern
    validateString('message', { minLength: 1, maxLength: 500 }),
    // Use body() directly for optional fields demonstration
    body('name')
      .optional()
      .trim()
      .escape()
      .isLength({ max: 100 })
      .withMessage('name must be at most 100 characters'),
    // Handle validation errors - returns 400 with error details if validation fails
    handleValidationErrors
  ],
  (req, res) => {
    const response = {
      status: 200,
      message: 'Echo successful',
      data: {
        message: req.body.message
      }
    };
    
    // Include name in response if provided
    if (req.body.name) {
      response.data.name = req.body.name;
    }
    
    res.status(200).json(response);
  }
);

module.exports = router;
