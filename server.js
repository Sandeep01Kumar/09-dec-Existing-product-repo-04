/**
 * Secure HTTP/HTTPS Server Entry Point
 * 
 * Creates and starts HTTP and HTTPS servers using the Express application.
 * Implements TLS encryption when HTTPS_ENABLED=true in environment.
 * Includes graceful shutdown handling for clean server termination.
 * 
 * @module server
 */

'use strict';

const http = require('http');
const https = require('https');
const app = require('./app');
const { httpsConfig, tlsOptions, getCertificates, isHttpsConfigured } = require('./config/https');

// ============================================================================
// Configuration
// ============================================================================

const PORT = parseInt(process.env.PORT, 10) || 3000;
const HTTPS_PORT = httpsConfig.port;
const hostname = process.env.HOST || '127.0.0.1';

// ============================================================================
// HTTP Server
// ============================================================================

const httpServer = http.createServer(app);

httpServer.listen(PORT, hostname, () => {
  console.log(`HTTP Server running at http://${hostname}:${PORT}/`);
});

// ============================================================================
// HTTPS Server (Conditional)
// ============================================================================

let httpsServer = null;

if (isHttpsConfigured()) {
  try {
    const certificates = getCertificates();
    const httpsOptions = {
      ...certificates,
      ...tlsOptions
    };
    
    httpsServer = https.createServer(httpsOptions, app);
    
    httpsServer.listen(HTTPS_PORT, hostname, () => {
      console.log(`HTTPS Server running at https://${hostname}:${HTTPS_PORT}/`);
    });
  } catch (error) {
    console.error('[HTTPS] Failed to start HTTPS server:', error.message);
    console.error('[HTTPS] Continuing with HTTP only');
  }
} else if (httpsConfig.enabled) {
  console.warn('[HTTPS] HTTPS_ENABLED is true but certificates are missing');
  console.warn('[HTTPS] Run "npm run generate-certs" to create development certificates');
  console.warn('[HTTPS] Continuing with HTTP only');
}

// ============================================================================
// Graceful Shutdown
// ============================================================================

/**
 * Handles graceful server shutdown on process termination signals
 * Closes all active connections before exiting
 * 
 * @param {string} signal - The signal that triggered shutdown
 */
function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  httpServer.close(() => {
    console.log('HTTP server closed');
    
    if (httpsServer) {
      httpsServer.close(() => {
        console.log('HTTPS server closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
  
  // Force close after timeout
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ============================================================================
// Error Handling
// ============================================================================

httpServer.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  } else {
    console.error('HTTP server error:', error.message);
  }
  process.exit(1);
});

if (httpsServer) {
  httpsServer.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${HTTPS_PORT} is already in use`);
    } else {
      console.error('HTTPS server error:', error.message);
    }
  });
}

module.exports = { httpServer, httpsServer };
