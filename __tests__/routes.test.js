'use strict'; // enable strict mode for safer JavaScript semantics

const request = require('supertest'); // import Supertest to drive in-process HTTP assertions
const app = require('../app'); // import the Express app factory (no port binding) as the test subject

describe('Route layer (routes/index.js)', () => { // group all route-level API/integration tests
  let errorSpy; // holds the console.error spy so terminal-handler logging stays quiet
  beforeAll(() => { // before any test runs, silence expected error logging from the 404 handler
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); // replace console.error with a no-op spy
  }); // end beforeAll spy setup
  afterAll(() => { // after all tests complete, restore the original console.error implementation
    errorSpy.mockRestore(); // undo the spy so other suites/log output are unaffected
  }); // end afterAll spy teardown

  describe('GET /good-evening (F-016, P0)', () => { // suite for the new evening-greeting endpoint
    it('returns 200 with text/plain body "Good evening\\n"', async () => { // assert the new feature contract
      const res = await request(app).get('/good-evening'); // issue an in-process GET to the new route
      expect(res.status).toBe(200); // the endpoint must respond with HTTP 200 OK
      expect(res.headers['content-type']).toMatch(/text\/plain/); // Content-Type must be text/plain
      expect(res.text).toBe('Good evening\n'); // body must be exactly the evening greeting with trailing newline
    }); // end of GET /good-evening happy-path test
  }); // end of GET /good-evening suite

  describe('GET / (backward-compatibility regression, P0)', () => { // suite guarding the original endpoint
    it('returns 200 with unchanged body "Hello, World!\\n"', async () => { // assert the legacy contract is intact
      const res = await request(app).get('/'); // issue an in-process GET to the root route
      expect(res.status).toBe(200); // the root endpoint must still respond with HTTP 200 OK
      expect(res.headers['content-type']).toMatch(/text\/plain/); // Content-Type must remain text/plain
      expect(res.text).toBe('Hello, World!\n'); // body must be byte-identical to the original greeting
    }); // end of GET / regression test
  }); // end of GET / suite

  describe('GET /health', () => { // suite for the health-probe endpoint
    it('returns 200 with JSON { status: "ok", timestamp: <number> }', async () => { // assert the health contract
      const res = await request(app).get('/health'); // issue an in-process GET to the health route
      expect(res.status).toBe(200); // the health endpoint must respond with HTTP 200 OK
      expect(res.body.status).toBe('ok'); // the status field must equal the literal string 'ok'
      expect(typeof res.body.timestamp).toBe('number'); // the timestamp field must be a numeric epoch value
    }); // end of GET /health test
  }); // end of GET /health suite

  describe('POST /echo', () => { // suite for the validated echo endpoint
    it('returns 200 and echoes a valid message', async () => { // assert the valid-input success path
      const res = await request(app).post('/echo').send({ message: 'hello' }); // POST a plain alphanumeric message (avoids HTML escaping)
      expect(res.status).toBe(200); // a valid payload must yield HTTP 200 OK
      expect(res.body.status).toBe(200); // the envelope status field must be 200
      expect(res.body.message).toBe('Echo successful'); // the envelope message must confirm success
      expect(res.body.data.message).toBe('hello'); // the echoed data.message must match the sent value
    }); // end of POST /echo valid-message test

    it('includes data.name when an optional name is provided', async () => { // assert the optional name field is echoed
      const res = await request(app).post('/echo').send({ message: 'hi', name: 'bob' }); // POST a message plus an optional name
      expect(res.status).toBe(200); // a valid payload must yield HTTP 200 OK
      expect(res.body.data.name).toBe('bob'); // the optional name must be echoed back in data.name
    }); // end of POST /echo optional-name test

    it('returns 400 with a validation error envelope when message is missing', async () => { // assert the invalid-input path
      const res = await request(app).post('/echo').send({}); // POST an empty body to trigger validation failure
      expect(res.status).toBe(400); // a missing required field must yield HTTP 400 Bad Request
      expect(res.body.status).toBe(400); // the envelope status field must be 400
      expect(res.body.message).toBe('Validation failed'); // the envelope message must report a validation failure
      expect(Array.isArray(res.body.errors)).toBe(true); // the errors property must be an array
      expect(res.body.errors.length).toBeGreaterThan(0); // there must be at least one validation error entry
      expect(res.body.errors[0].field).toBe('message'); // the first error must reference the 'message' field
      expect(typeof res.body.errors[0].message).toBe('string'); // each error must carry a human-readable message string
    }); // end of POST /echo invalid-body test
  }); // end of POST /echo suite

  describe('Edge cases (P2)', () => { // suite for 404 and wrong-method edge behaviors
    it('returns 404 JSON envelope for an unknown path', async () => { // assert unknown routes fall through to the 404 handler
      const res = await request(app).get('/nope'); // issue a GET to a path that is not registered
      expect(res.status).toBe(404); // an unknown path must yield HTTP 404 Not Found
      expect(res.body.status).toBe(404); // the JSON envelope status field must be 404
      expect(typeof res.body.message).toBe('string'); // the envelope must include a message string
    }); // end of unknown-path 404 test

    it('returns 404 for POST /good-evening (method not registered)', async () => { // assert the new route rejects non-GET methods
      const res = await request(app).post('/good-evening').send({}); // POST to a GET-only route
      expect(res.status).toBe(404); // an unregistered method must fall through to HTTP 404
    }); // end of POST /good-evening 404 test

    it('returns 404 for PUT / (method not registered)', async () => { // assert the root route rejects non-GET methods
      const res = await request(app).put('/'); // PUT to a GET-only route
      expect(res.status).toBe(404); // an unregistered method must fall through to HTTP 404
      expect(res.body.status).toBe(404); // the JSON envelope status field must be 404
      expect(typeof res.body.message).toBe('string'); // the envelope must include a message string
    }); // end of PUT / 404 test

    it('returns 200 for GET /good-evening/ (trailing slash)', async () => { // assert non-strict routing keeps the new route reachable
      const res = await request(app).get('/good-evening/'); // issue a trailing-slash GET to the new evening-greeting route
      expect(res.status).toBe(200); // a trailing slash must still resolve to HTTP 200 OK (guards against accidental strict routing)
      expect(res.headers['content-type']).toMatch(/text\/plain/); // Content-Type must remain text/plain
      expect(res.text).toBe('Good evening\n'); // body must remain the exact evening greeting with trailing newline
    }); // end of GET /good-evening/ trailing-slash edge-case test
  }); // end of edge-cases suite
}); // end of route-layer test group
