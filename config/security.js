/**
 * Centralized Security Configuration Module
 * 
 * This module exports configuration objects for all Express.js security middleware:
 * - helmet (security headers)
 * - cors (cross-origin resource sharing)
 * - express-rate-limit (request throttling)
 * 
 * All settings are configurable via environment variables with secure defaults.
 * 
 * @module config/security
 * @see {@link https://helmetjs.github.io/} Helmet.js Documentation
 * @see {@link https://expressjs.com/en/resources/middleware/cors.html} CORS Middleware
 * @see {@link https://express-rate-limit.mintlify.app/} Express Rate Limit
 */

'use strict';

// ============================================================================
// Environment Variable Reading
// ============================================================================

/**
 * Current Node.js environment mode
 * @type {string}
 */
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Allowed CORS origin(s) - can be a string, array, or regex pattern
 * @type {string}
 */
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

/**
 * Rate limit window duration in milliseconds (default: 15 minutes)
 * @type {number}
 */
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000;

/**
 * Maximum number of requests allowed per window per IP (default: 100)
 * @type {number}
 */
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX, 10) || 100;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Determines if the application is running in development mode
 * 
 * @returns {boolean} True if NODE_ENV is 'development', false otherwise
 * @example
 * if (isDevelopment()) {
 *   console.log('Running in development mode');
 * }
 */
const isDevelopment = () => {
  return NODE_ENV === 'development';
};

// ============================================================================
// Rate Limit Configuration
// ============================================================================

/**
 * Configuration object for express-rate-limit middleware
 * 
 * Implements IP-based request throttling to prevent DoS attacks and brute force attempts.
 * Uses modern draft-8 RateLimit headers for standards compliance.
 * 
 * @type {Object}
 * @property {number} windowMs - Time window for rate limiting in milliseconds
 * @property {number} limit - Maximum requests allowed per window per IP
 * @property {string} standardHeaders - RateLimit header standard version
 * @property {boolean} legacyHeaders - Whether to send deprecated X-RateLimit headers
 * @property {Object} message - Response body when rate limit is exceeded
 * @property {Function} skip - Function to skip rate limiting for certain requests
 * 
 * @see {@link https://express-rate-limit.mintlify.app/reference/configuration}
 */
const rateLimitConfig = {
  /**
   * Time window for rate limiting (default: 15 minutes)
   */
  windowMs: RATE_LIMIT_WINDOW_MS,

  /**
   * Maximum number of requests per window per IP (default: 100)
   */
  limit: RATE_LIMIT_MAX,

  /**
   * Use modern draft-8 standard RateLimit headers
   * Sends: RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset
   */
  standardHeaders: 'draft-8',

  /**
   * Disable deprecated X-RateLimit-* headers for cleaner responses
   */
  legacyHeaders: false,

  /**
   * Response body sent when rate limit is exceeded
   */
  message: {
    status: 429,
    message: 'Too many requests, please try again later.'
  },

  /**
   * Skip rate limiting for health check endpoints
   * This allows monitoring systems to check application health without being throttled
   * 
   * @param {Object} req - Express request object
   * @returns {boolean} True to skip rate limiting, false to apply it
   */
  skip: (req) => {
    return req.path === '/health';
  }
};

// ============================================================================
// CORS Configuration
// ============================================================================

/**
 * Configuration object for cors middleware
 * 
 * Implements Cross-Origin Resource Sharing (CORS) policy to control
 * which origins can access the API resources.
 * 
 * @type {Object}
 * @property {string|Array|RegExp} origin - Allowed origin(s) for cross-origin requests
 * @property {Array<string>} methods - Allowed HTTP methods
 * @property {Array<string>} allowedHeaders - Allowed request headers
 * @property {boolean} credentials - Whether to allow credentials (cookies, auth headers)
 * @property {number} optionsSuccessStatus - Success status for preflight OPTIONS requests
 * 
 * @see {@link https://expressjs.com/en/resources/middleware/cors.html#configuration-options}
 */
const corsConfig = {
  /**
   * Allowed origin(s) - configurable via CORS_ORIGIN environment variable
   * In production, this should be set to specific allowed domains
   * Default '*' allows all origins (suitable for development only)
   */
  origin: CORS_ORIGIN,

  /**
   * Allowed HTTP methods for cross-origin requests
   */
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],

  /**
   * Allowed request headers
   * Content-Type: Required for JSON/form data
   * Authorization: Required for Bearer token authentication
   */
  allowedHeaders: ['Content-Type', 'Authorization'],

  /**
   * Allow credentials (cookies, authorization headers) in cross-origin requests
   * Required for authenticated cross-origin API calls
   */
  credentials: true,

  /**
   * Success status code for preflight OPTIONS requests
   * 200 provides better compatibility with legacy browsers (IE11)
   * Modern browsers handle 204 correctly
   */
  optionsSuccessStatus: 200
};

// ============================================================================
// Helmet Configuration
// ============================================================================

/**
 * Configuration object for helmet middleware
 * 
 * Helmet sets various HTTP security headers to protect against common
 * web vulnerabilities including XSS, clickjacking, and MIME sniffing attacks.
 * 
 * @type {Object}
 * @property {boolean|Object} contentSecurityPolicy - CSP configuration
 * @property {boolean} crossOriginEmbedderPolicy - COEP header setting
 * @property {Object} hsts - HTTP Strict Transport Security settings
 * 
 * @see {@link https://helmetjs.github.io/}
 */
const helmetConfig = {
  /**
   * Content Security Policy configuration
   * 
   * In development: Disabled to allow easier debugging with inline scripts/styles
   * In production: Use helmet defaults which provide strong XSS protection
   * 
   * Production default includes:
   * - default-src 'self'
   * - base-uri 'self'
   * - font-src 'self' https: data:
   * - form-action 'self'
   * - frame-ancestors 'self'
   * - img-src 'self' data:
   * - object-src 'none'
   * - script-src 'self'
   * - style-src 'self' https: 'unsafe-inline'
   */
  contentSecurityPolicy: isDevelopment() ? false : {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      fontSrc: ["'self'", 'https:', 'data:'],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
      upgradeInsecureRequests: []
    }
  },

  /**
   * Cross-Origin-Embedder-Policy header
   * 
   * Disabled by default as it can break loading of cross-origin resources
   * Enable if your application requires cross-origin isolation for features
   * like SharedArrayBuffer
   */
  crossOriginEmbedderPolicy: false,

  /**
   * HTTP Strict Transport Security (HSTS) configuration
   * 
   * Forces browsers to use HTTPS for future requests to this domain
   * maxAge: 1 year (31536000 seconds) - recommended minimum
   * includeSubDomains: Apply HSTS to all subdomains
   */
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true
  }
};

// ============================================================================
// Module Exports
// ============================================================================

module.exports = {
  rateLimitConfig,
  corsConfig,
  helmetConfig,
  isDevelopment
};
