/**
 * Express Application Factory
 * 
 * Creates and configures the Express application with full security middleware chain.
 * Implements helmet.js for security headers, express-rate-limit for request throttling,
 * cors middleware for cross-origin policies, body parsing, route handlers, and error handling.
 * 
 * Middleware Stack Order (per Agent Action Plan Section 0.5.2):
 * 1. helmet() - Security headers
 * 2. rateLimit() - Request throttling
 * 3. cors() - Cross-origin control
 * 4. express.json() - JSON body parsing
 * 5. express.urlencoded() - Form body parsing
 * 6. Route handlers
 * 7. Error handler middleware
 * 
 * @module app
 */

'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { rateLimit } = require('express-rate-limit');

// Import security configuration
const { rateLimitConfig, corsConfig, helmetConfig } = require('./config/security');

// Import routes
const routes = require('./routes');

// Import error handler
const errorHandler = require('./middleware/errorHandler');

// Create Express application
const app = express();

// ============================================================================
// Security Middleware Stack
// ============================================================================

/**
 * 1. Helmet - Security Headers
 * Sets HTTP security headers including:
 * - Content-Security-Policy
 * - Cross-Origin-Opener-Policy
 * - Cross-Origin-Resource-Policy
 * - Strict-Transport-Security
 * - X-Frame-Options
 * - Removes X-Powered-By
 */
app.use(helmet(helmetConfig));

/**
 * 2. Rate Limiting - Request Throttling
 * Limits requests per IP to prevent DoS attacks and brute force attempts
 * Default: 100 requests per 15-minute window per IP
 * Returns 429 Too Many Requests when limit exceeded
 */
app.use(rateLimit(rateLimitConfig));

/**
 * 3. CORS - Cross-Origin Resource Sharing
 * Controls which origins can access API resources
 * Configurable via CORS_ORIGIN environment variable
 */
app.use(cors(corsConfig));

// ============================================================================
// Body Parsing Middleware
// ============================================================================

/**
 * 4. JSON Body Parser
 * Parses incoming requests with JSON payloads
 * Limit set to prevent large payload attacks
 */
app.use(express.json({ limit: '10kb' }));

/**
 * 5. URL-Encoded Body Parser
 * Parses incoming requests with URL-encoded payloads
 * Extended: true allows for rich objects and arrays
 */
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ============================================================================
// Application Routes
// ============================================================================

/**
 * 6. Route Handlers
 * All application routes including:
 * - GET / - Hello World endpoint
 * - GET /health - Health check endpoint
 * - POST /echo - Example validated endpoint
 */
app.use('/', routes);

// ============================================================================
// Error Handling
// ============================================================================

/**
 * 404 Handler
 * Catches requests to undefined routes
 */
app.use((req, res, next) => {
  const error = new Error('Not Found');
  error.status = 404;
  next(error);
});

/**
 * 7. Error Handler Middleware
 * Security-aware error handling that:
 * - Hides stack traces in production
 * - Returns generic messages for server errors
 * - Provides detailed info in development
 */
app.use(errorHandler);

module.exports = app;
