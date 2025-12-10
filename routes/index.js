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
 * Example endpoint demonstrating input validation middleware
 * Echoes back the validated and sanitized message from request body
 * 
 * @param {string} req.body.message - Message to echo back (required, 1-500 chars)
 * @returns {Object} JSON response with validated message
 */
router.post('/echo',
  [
    body('message')
      .trim()
      .escape()
      .notEmpty()
      .withMessage('message is required')
      .isLength({ min: 1, max: 500 })
      .withMessage('message must be between 1 and 500 characters'),
    handleValidationErrors
  ],
  (req, res) => {
    res.status(200).json({
      status: 200,
      message: 'Echo successful',
      data: {
        message: req.body.message
      }
    });
  }
);

module.exports = router;
