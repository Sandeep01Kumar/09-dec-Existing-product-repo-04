'use strict'; // enable strict mode for safer JavaScript semantics

const https = require('../config/https'); // import the HTTPS/TLS config for the default (env-independent) assertions

describe('Configuration unit tests', () => { // group all configuration-layer unit tests
  describe('config/security.js (P3)', () => { // suite for the security configuration objects
    const ORIGINAL_ENV = process.env.NODE_ENV; // capture Jest's ambient NODE_ENV (typically 'test') to restore later

    afterEach(() => { // after each case, undo any environment mutation
      process.env.NODE_ENV = ORIGINAL_ENV; // restore the original NODE_ENV value
      jest.resetModules(); // drop cached modules so the next test re-evaluates module-load logic cleanly
    }); // end afterEach teardown

    function loadSecurity(nodeEnv) { // helper that loads a fresh security module under a chosen NODE_ENV
      jest.resetModules(); // clear the module registry so module-load env reads happen again
      if (nodeEnv === undefined) { // when the caller wants NODE_ENV unset
        delete process.env.NODE_ENV; // remove NODE_ENV so the module falls back to its 'development' default
      } else { // otherwise the caller specified an explicit environment
        process.env.NODE_ENV = nodeEnv; // set NODE_ENV before requiring so the module captures it
      } // end environment selection
      return require('../config/security'); // re-require to evaluate the module under the chosen environment
    } // end loadSecurity helper

    it('skips rate limiting only for the /health path', () => { // assert the rate-limit skip predicate
      const security = loadSecurity('development'); // load a deterministic instance for env-independent checks
      expect(security.rateLimitConfig.skip({ path: '/health' })).toBe(true); // /health must be exempt from rate limiting
      expect(security.rateLimitConfig.skip({ path: '/' })).toBe(false); // all other paths must be rate limited
    }); // end of skip-predicate test

    it('defines the expected CORS policy', () => { // assert the CORS configuration values
      const security = loadSecurity('development'); // load a deterministic instance
      expect(security.corsConfig.methods).toEqual(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']); // allowed methods must match the policy
      expect(security.corsConfig.allowedHeaders).toEqual(['Content-Type', 'Authorization']); // allowed headers must match the policy
      expect(security.corsConfig.credentials).toBe(true); // credentialed requests must be permitted
      expect(security.corsConfig.optionsSuccessStatus).toBe(200); // preflight success status must be 200
      expect(security.corsConfig.origin).toBe('*'); // the default origin must be the wildcard when CORS_ORIGIN is unset
    }); // end of CORS-policy test

    it('configures HSTS for one year including subdomains', () => { // assert the Helmet HSTS settings
      const security = loadSecurity('development'); // load a deterministic instance
      expect(security.helmetConfig.hsts.maxAge).toBe(31536000); // HSTS max-age must be one year in seconds
      expect(security.helmetConfig.hsts.includeSubDomains).toBe(true); // HSTS must include subdomains
    }); // end of HSTS test

    it('exposes isDevelopment reflecting NODE_ENV', () => { // assert the environment helper across both branches
      const devSecurity = loadSecurity('development'); // load the module with NODE_ENV=development
      expect(typeof devSecurity.isDevelopment).toBe('function'); // isDevelopment must be exported as a function
      expect(devSecurity.isDevelopment()).toBe(true); // it must report true in a development environment
      const prodSecurity = loadSecurity('production'); // reload the module with NODE_ENV=production
      expect(prodSecurity.isDevelopment()).toBe(false); // it must report false outside development
    }); // end of isDevelopment test

    it('disables CSP in development and enables a directive object in production', () => { // assert both CSP module-load branches
      const devSecurity = loadSecurity('development'); // load the module under development
      expect(devSecurity.helmetConfig.contentSecurityPolicy).toBe(false); // development disables CSP for tooling convenience
      const prodSecurity = loadSecurity('production'); // reload the module under production
      expect(typeof prodSecurity.helmetConfig.contentSecurityPolicy).toBe('object'); // production must define a CSP directives object
      expect(prodSecurity.helmetConfig.contentSecurityPolicy).not.toBeNull(); // the CSP object must not be null
    }); // end of CSP-branch test
  }); // end of security suite

  describe('config/https.js (P3)', () => { // suite for the HTTPS/TLS configuration
    const SAVED_ENV = { // snapshot the HTTPS-related env vars so each case can restore them
      HTTPS_ENABLED: process.env.HTTPS_ENABLED, // remember the original HTTPS_ENABLED value
      SSL_KEY_PATH: process.env.SSL_KEY_PATH, // remember the original SSL_KEY_PATH value
      SSL_CERT_PATH: process.env.SSL_CERT_PATH, // remember the original SSL_CERT_PATH value
    }; // end env snapshot

    afterEach(() => { // after each case, restore the HTTPS env vars and reset modules
      process.env.HTTPS_ENABLED = SAVED_ENV.HTTPS_ENABLED; // restore HTTPS_ENABLED (may be undefined)
      process.env.SSL_KEY_PATH = SAVED_ENV.SSL_KEY_PATH; // restore SSL_KEY_PATH
      process.env.SSL_CERT_PATH = SAVED_ENV.SSL_CERT_PATH; // restore SSL_CERT_PATH
      if (SAVED_ENV.HTTPS_ENABLED === undefined) { delete process.env.HTTPS_ENABLED; } // delete if it was originally unset
      if (SAVED_ENV.SSL_KEY_PATH === undefined) { delete process.env.SSL_KEY_PATH; } // delete if it was originally unset
      if (SAVED_ENV.SSL_CERT_PATH === undefined) { delete process.env.SSL_CERT_PATH; } // delete if it was originally unset
      jest.resetModules(); // reset the module registry so later requires re-evaluate env
    }); // end afterEach teardown

    it('provides HTTPS defaults with TLS disabled', () => { // assert the default httpsConfig values
      expect(https.httpsConfig.port).toBe(3443); // the default HTTPS port must be 3443
      expect(https.httpsConfig.enabled).toBe(false); // HTTPS must be disabled when HTTPS_ENABLED is unset
      expect(https.httpsConfig.keyPath).toBe('./certs/key.pem'); // the default key path must point at ./certs/key.pem
      expect(https.httpsConfig.certPath).toBe('./certs/cert.pem'); // the default cert path must point at ./certs/cert.pem
    }); // end of httpsConfig-defaults test

    it('enforces a secure TLS baseline', () => { // assert the tlsOptions hardening values
      expect(https.tlsOptions.minVersion).toBe('TLSv1.2'); // the minimum TLS version must be 1.2
      expect(https.tlsOptions.honorCipherOrder).toBe(true); // the server must honor its own cipher ordering
      expect(typeof https.tlsOptions.ciphers).toBe('string'); // the cipher suite list must be a string
      expect(https.tlsOptions.ciphers.length).toBeGreaterThan(0); // the cipher suite list must be non-empty
    }); // end of tlsOptions test

    it('reports HTTPS as not configured and throws when the key file is missing', () => { // assert the default-helper behaviors
      expect(https.isHttpsConfigured()).toBe(false); // with HTTPS disabled the helper must return false without checking files
      expect(() => https.getCertificates()).toThrow(/SSL private key file not found/); // a missing key file must throw the key-not-found error
    }); // end of key-missing test

    it('throws a certificate-not-found error when the key exists but the cert does not', () => { // cover the cert-missing branch
      jest.resetModules(); // clear the registry so new env values take effect at module load
      process.env.SSL_KEY_PATH = 'package.json'; // point the key path at a file that definitely exists at the project root
      process.env.SSL_CERT_PATH = 'certs/missing-cert.pem'; // point the cert path at a file that does not exist
      const freshHttps = require('../config/https'); // re-require so httpsConfig captures the new paths
      expect(() => freshHttps.getCertificates()).toThrow(/SSL certificate file not found/); // the second existence check must throw
    }); // end of cert-missing test

    it('returns false from isHttpsConfigured when enabled but certificates are absent', () => { // cover the enabled file-check branch
      jest.resetModules(); // clear the registry so new env values take effect at module load
      process.env.HTTPS_ENABLED = 'true'; // enable HTTPS so the helper proceeds to the file-existence check
      const freshHttps = require('../config/https'); // re-require so httpsConfig.enabled becomes true
      expect(freshHttps.httpsConfig.enabled).toBe(true); // confirm the module captured the enabled flag
      expect(freshHttps.isHttpsConfigured()).toBe(false); // missing certificate files must still yield false
    }); // end of enabled-but-missing-certs test
  }); // end of https suite
}); // end of configuration unit-test group
