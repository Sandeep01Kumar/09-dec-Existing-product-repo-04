/**
 * Rate Limiting Middleware Factory
 * 
 * Provides configurable request throttling middleware using express-rate-limit.
 * Creates middleware instances that limit the number of requests per IP address
 * within a sliding time window to prevent DoS attacks and brute force attempts.
 * 
 * Implements OWASP A04:2021 - Insecure Design prevention through rate limiting.
 * Uses modern draft-8 RateLimit headers for standards compliance.
 * 
 * @module middleware/rateLimiter
 * @see {@link https://express-rate-limit.mintlify.app/}
 */

'use strict';

const { rateLimit } = require('express-rate-limit');

/**
 * Factory function to create rate limiter middleware with custom options
 * 
 * @param {Object} options - Configuration options for the rate limiter
 * @param {number} [options.windowMs=900000] - Time window in milliseconds (default: 15 minutes)
 * @param {number} [options.limit=100] - Maximum requests per window per IP (default: 100)
 * @param {string} [options.standardHeaders='draft-8'] - RateLimit header standard version
 * @param {boolean} [options.legacyHeaders=false] - Whether to send deprecated X-RateLimit headers
 * @param {Object} [options.message] - Response body when rate limit exceeded
 * @returns {Function} Express middleware function
 * 
 * @example
 * const { createRateLimiter } = require('./middleware/rateLimiter');
 * app.use('/api', createRateLimiter({ limit: 50 }));
 */
function createRateLimiter(options = {}) {
  const defaults = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // 100 requests per window per IP
    standardHeaders: 'draft-8', // Modern RateLimit headers
    legacyHeaders: false, // Disable deprecated X-RateLimit headers
    message: {
      status: 429,
      message: 'Too many requests, please try again later.'
    }
  };

  return rateLimit({ ...defaults, ...options });
}

/**
 * Default rate limiter for general API endpoints
 * 100 requests per 15 minutes per IP address
 */
const defaultLimiter = createRateLimiter();

/**
 * Strict rate limiter for sensitive endpoints (login, password reset, etc.)
 * 10 requests per 1 minute per IP address
 */
const strictLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  limit: 10 // 10 requests per minute
});

module.exports = {
  createRateLimiter,
  defaultLimiter,
  strictLimiter
};
