/**
 * HTTPS/TLS Configuration Module
 * 
 * Provides configuration objects and utility functions for setting up
 * a secure HTTPS server with TLS encryption. Reads SSL certificate paths
 * and HTTPS settings from environment variables with sensible defaults.
 * 
 * @module config/https
 */

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * HTTPS server configuration object
 * Contains port, enabled status, and certificate file paths
 * All values are configurable via environment variables
 */
const httpsConfig = {
  /**
   * Port number for the HTTPS server
   * @type {number}
   */
  port: parseInt(process.env.HTTPS_PORT, 10) || 3443,

  /**
   * Whether HTTPS is enabled
   * Set HTTPS_ENABLED=true in environment to enable
   * @type {boolean}
   */
  enabled: process.env.HTTPS_ENABLED === 'true',

  /**
   * Path to the SSL/TLS private key file
   * @type {string}
   */
  keyPath: process.env.SSL_KEY_PATH || './certs/key.pem',

  /**
   * Path to the SSL/TLS certificate file
   * @type {string}
   */
  certPath: process.env.SSL_CERT_PATH || './certs/cert.pem'
};

/**
 * TLS options for Node.js https.createServer
 * Configures secure TLS settings following security best practices
 */
const tlsOptions = {
  /**
   * Minimum TLS version allowed
   * TLSv1.2 is required; older versions (SSLv3, TLS 1.0, TLS 1.1) are insecure
   * @type {string}
   */
  minVersion: 'TLSv1.2',

  /**
   * Use the server's cipher suite preference order rather than the client's
   * This ensures the most secure mutually-supported cipher is used
   * @type {boolean}
   */
  honorCipherOrder: true,

  /**
   * Secure cipher suites in order of preference
   * Prioritizes ECDHE for forward secrecy, followed by AES-GCM for AEAD encryption
   * Excludes weak ciphers, RC4, DES, MD5, and export ciphers
   * @type {string}
   */
  ciphers: [
    'ECDHE-ECDSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-ECDSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-ECDSA-CHACHA20-POLY1305',
    'ECDHE-RSA-CHACHA20-POLY1305',
    'DHE-RSA-AES128-GCM-SHA256',
    'DHE-RSA-AES256-GCM-SHA384'
  ].join(':')
};

/**
 * Reads and returns SSL/TLS certificate files for HTTPS server configuration
 * 
 * This function resolves the certificate paths relative to the project root,
 * verifies that both key and certificate files exist, and reads them as buffers.
 * 
 * @returns {{ key: Buffer, cert: Buffer }} Object containing key and cert buffers
 * @throws {Error} If certificate files are not found at the configured paths
 * 
 * @example
 * const { getCertificates } = require('./config/https');
 * const https = require('https');
 * const app = require('./app');
 * 
 * const certs = getCertificates();
 * const server = https.createServer({ ...certs, ...tlsOptions }, app);
 */
function getCertificates() {
  // Resolve paths relative to project root (parent of config directory)
  const projectRoot = path.resolve(__dirname, '..');
  const keyPath = path.resolve(projectRoot, httpsConfig.keyPath);
  const certPath = path.resolve(projectRoot, httpsConfig.certPath);

  // Verify key file exists
  if (!fs.existsSync(keyPath)) {
    throw new Error(
      `SSL private key file not found at: ${keyPath}\n` +
      'Please ensure SSL_KEY_PATH environment variable points to a valid key file, ' +
      'or run "npm run generate-certs" to create self-signed certificates for development.'
    );
  }

  // Verify certificate file exists
  if (!fs.existsSync(certPath)) {
    throw new Error(
      `SSL certificate file not found at: ${certPath}\n` +
      'Please ensure SSL_CERT_PATH environment variable points to a valid certificate file, ' +
      'or run "npm run generate-certs" to create self-signed certificates for development.'
    );
  }

  // Read and return certificate files as buffers
  return {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };
}

/**
 * Checks if HTTPS is properly configured and ready to use
 * 
 * Verifies that HTTPS is enabled via environment variable AND
 * that the required certificate files exist at the configured paths.
 * 
 * @returns {boolean} True if HTTPS is enabled and certificates exist, false otherwise
 * 
 * @example
 * const { isHttpsConfigured } = require('./config/https');
 * 
 * if (isHttpsConfigured()) {
 *   // Start HTTPS server
 * }
 */
function isHttpsConfigured() {
  // HTTPS must be explicitly enabled
  if (!httpsConfig.enabled) {
    return false;
  }

  // Resolve paths relative to project root
  const projectRoot = path.resolve(__dirname, '..');
  const keyPath = path.resolve(projectRoot, httpsConfig.keyPath);
  const certPath = path.resolve(projectRoot, httpsConfig.certPath);

  // Both certificate files must exist
  return fs.existsSync(keyPath) && fs.existsSync(certPath);
}

// Export all configuration objects and utility functions
module.exports = {
  httpsConfig,
  tlsOptions,
  getCertificates,
  isHttpsConfigured
};
