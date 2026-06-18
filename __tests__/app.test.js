'use strict'; // enable strict mode for safer JavaScript semantics

const request = require('supertest'); // import Supertest to drive in-process HTTP assertions
const app = require('../app'); // import the assembled Express app (helmet + rate-limit + cors + body parsers + routes)

describe('Application integration (app.js)', () => { // group application-level pipeline tests
  let errorSpy; // holds the console.error spy used to silence expected 404 logging
  beforeAll(() => { // before any test runs, suppress terminal-handler error logging
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); // replace console.error with a no-op spy
  }); // end beforeAll spy setup
  afterAll(() => { // after all tests complete, restore the original console.error
    errorSpy.mockRestore(); // undo the spy so output is unaffected elsewhere
  }); // end afterAll spy teardown

  describe('Security headers (Helmet, P1)', () => { // suite verifying defense-in-depth headers are applied
    it('sets X-Frame-Options and HSTS and removes X-Powered-By', async () => { // assert key security headers on a normal response
      const res = await request(app).get('/good-evening'); // request a normal route to inspect its response headers
      expect(res.status).toBe(200); // the request must succeed so headers reflect a real response
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN'); // Helmet must set clickjacking protection to SAMEORIGIN
      expect(res.headers['strict-transport-security']).toMatch(/max-age=31536000/); // HSTS must advertise a one-year max-age
      expect(res.headers['strict-transport-security']).toMatch(/includeSubDomains/); // HSTS must include subdomains
      expect(res.headers['x-content-type-options']).toBe('nosniff'); // Helmet must disable MIME sniffing
      expect(res.headers['x-powered-by']).toBeUndefined(); // the Express fingerprint header must be removed
    }); // end of security-headers test
  }); // end of security-headers suite

  describe('CORS behavior (P1)', () => { // suite verifying cross-origin configuration
    it('reflects the wildcard Access-Control-Allow-Origin for a cross-origin GET', async () => { // assert simple-request CORS header
      const res = await request(app).get('/good-evening').set('Origin', 'http://example.com'); // send a cross-origin GET with an Origin header
      expect(res.status).toBe(200); // the request must succeed
      expect(res.headers['access-control-allow-origin']).toBe('*'); // CORS must allow any origin per the default wildcard config
    }); // end of simple-CORS test

    it('answers an OPTIONS preflight with 200 and the configured methods', async () => { // assert preflight handling
      const res = await request(app) // build a preflight OPTIONS request
        .options('/good-evening') // target the new route with the OPTIONS method
        .set('Origin', 'http://example.com') // include the required Origin header
        .set('Access-Control-Request-Method', 'GET'); // declare the intended actual method
      expect(res.status).toBe(200); // preflight must return 200 per corsConfig.optionsSuccessStatus
      expect(res.headers['access-control-allow-methods']).toBe('GET,POST,PUT,DELETE,OPTIONS'); // allowed methods must match corsConfig
    }); // end of preflight test
  }); // end of CORS suite

  describe('404 envelope (terminal handler, P1)', () => { // suite verifying the not-found contract
    it('returns a 404 JSON body containing status and message', async () => { // assert the not-found envelope shape
      const res = await request(app).get('/definitely-not-a-route'); // request a path that is not registered
      expect(res.status).toBe(404); // the unmatched route must produce HTTP 404
      expect(res.headers['content-type']).toMatch(/application\/json/); // the error handler must respond with JSON
      expect(res.body.status).toBe(404); // the JSON envelope must carry a 404 status field
      expect(typeof res.body.message).toBe('string'); // the JSON envelope must include a message string
    }); // end of 404-envelope test
  }); // end of 404 suite
}); // end of application-integration test group
