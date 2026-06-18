'use strict'; // enable strict mode for safer JavaScript semantics

const request = require('supertest'); // import Supertest to exercise validators through a tiny app
const express = require('express'); // import Express to build minimal apps for validator integration
const errorHandler = require('../middleware/errorHandler'); // import the terminal error handler under test
const validator = require('../middleware/validator'); // import the validation helper module under test
const rateLimiter = require('../middleware/rateLimiter'); // import the rate-limiter factory module under test

describe('Middleware unit tests', () => { // group all middleware-layer unit tests
  describe('errorHandler (middleware/errorHandler.js, P2)', () => { // suite for the centralized error handler
    const ORIGINAL_ENV = process.env.NODE_ENV; // capture the starting NODE_ENV so each case can restore it
    let errorSpy; // holds the console.error spy used to silence handler logging

    beforeEach(() => { // before each case, silence the handler's console.error logging
      errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); // replace console.error with a no-op spy
    }); // end beforeEach setup

    afterEach(() => { // after each case, restore environment and console.error
      process.env.NODE_ENV = ORIGINAL_ENV; // restore NODE_ENV because the handler reads it at call time
      errorSpy.mockRestore(); // undo the console.error spy
    }); // end afterEach teardown

    function mockRes() { // factory building a minimal Express-like response double
      return { // return the response double object
        headersSent: false, // mirror the Express headersSent flag (defaults false)
        statusCode: null, // capture the status code passed to status()
        body: null, // capture the payload passed to json()
        status(code) { this.statusCode = code; return this; }, // record status and allow chaining
        json(payload) { this.body = payload; return this; }, // record the JSON body and allow chaining
      }; // end of returned double
    } // end of mockRes factory

    it('emits a detailed envelope in development', () => { // assert the dev-mode response shape
      process.env.NODE_ENV = 'development'; // force non-production so the verbose branch is taken
      const res = mockRes(); // create a fresh response double
      const err = new Error('boom'); // build an error to pass through the handler
      err.status = 400; // tag the error with an explicit HTTP status
      errorHandler(err, { originalUrl: '/x', method: 'GET' }, res, () => {}); // invoke the 4-arg handler with a request double
      expect(res.statusCode).toBe(400); // the handler must echo the error's status
      expect(res.body.status).toBe(400); // the envelope status field must match
      expect(res.body.message).toBe('boom'); // the message must surface the error text in dev
      expect(res.body.error).toBe('boom'); // dev mode must expose the raw error message
      expect(typeof res.body.stack).toBe('string'); // dev mode must expose the stack trace
      expect(res.body.path).toBe('/x'); // the envelope must include the requested path
      expect(res.body.method).toBe('GET'); // the envelope must include the request method
    }); // end of dev-envelope test

    it('falls back to a default message in development when the error has none', () => { // cover the message-fallback branch
      process.env.NODE_ENV = 'development'; // force the development branch
      const res = mockRes(); // create a fresh response double
      const err = new Error(''); // build an error with an empty message to trigger the fallback
      err.status = 500; // mark it as a server error
      errorHandler(err, { originalUrl: '/d', method: 'GET' }, res, () => {}); // invoke the handler
      expect(res.statusCode).toBe(500); // the status must be 500
      expect(res.body.message).toBe('An unexpected error occurred'); // the dev fallback message must be used
    }); // end of dev message-fallback test

    it('sanitizes a 4xx envelope in production', () => { // assert the prod client-error shape
      process.env.NODE_ENV = 'production'; // force production so the sanitized branch is taken
      const res = mockRes(); // create a fresh response double
      const err = new Error('bad input'); // build a client-error message
      err.status = 400; // mark it as a 4xx client error
      errorHandler(err, { originalUrl: '/x', method: 'POST' }, res, () => {}); // invoke the handler in production mode
      expect(res.statusCode).toBe(400); // the status must remain 400
      expect(res.body.status).toBe(400); // the envelope status must be 400
      expect(res.body.message).toBe('bad input'); // a 4xx message is safe to surface to clients
      expect(res.body.stack).toBeUndefined(); // production must not leak a stack trace
      expect(res.body.error).toBeUndefined(); // production must not leak the raw error field
    }); // end of prod-4xx test

    it('uses the default 4xx message in production when the error has none', () => { // cover the prod 4xx fallback branch
      process.env.NODE_ENV = 'production'; // force production
      const res = mockRes(); // create a fresh response double
      const err = new Error(''); // build a client error with no message
      err.status = 422; // mark it as a 4xx client error
      errorHandler(err, { originalUrl: '/p', method: 'POST' }, res, () => {}); // invoke the handler
      expect(res.statusCode).toBe(422); // the status must remain 422
      expect(res.body.message).toBe('Bad request'); // the production 4xx fallback message must be used
    }); // end of prod 4xx-fallback test

    it('masks a 5xx envelope in production', () => { // assert the prod server-error shape
      process.env.NODE_ENV = 'production'; // force production so server errors are masked
      const res = mockRes(); // create a fresh response double
      const err = new Error('secret detail'); // build an error with no explicit status (defaults to 500)
      errorHandler(err, { originalUrl: '/y', method: 'GET' }, res, () => {}); // invoke the handler in production mode
      expect(res.statusCode).toBe(500); // a status-less error must default to 500
      expect(res.body.status).toBe(500); // the envelope status must be 500
      expect(res.body.message).toBe('Internal server error'); // 5xx details must be masked behind a generic message
    }); // end of prod-5xx test

    it('delegates to next(err) when headers are already sent', () => { // assert the already-committed-response path
      const res = mockRes(); // create a fresh response double
      res.headersSent = true; // simulate a response whose headers were already flushed
      const err = new Error('late'); // build an error that arrives after headers are sent
      const next = jest.fn(); // create a spy to capture the delegation to Express
      errorHandler(err, { originalUrl: '/z', method: 'GET' }, res, next); // invoke the handler with the committed response
      expect(next).toHaveBeenCalledWith(err); // the handler must forward the error to Express's default handler
      expect(res.statusCode).toBeNull(); // the handler must not attempt to write a status
    }); // end of headersSent test

    it('is a 4-argument Express error middleware', () => { // assert the handler signature contract
      expect(typeof errorHandler).toBe('function'); // the export must be a function
      expect(errorHandler.length).toBe(4); // Express identifies error middleware by its four parameters
    }); // end of signature test
  }); // end of errorHandler suite

  describe('validator (middleware/validator.js, P2)', () => { // suite for the validation helpers
    it('calls next() and reaches the handler when validation passes', async () => { // assert the success path
      const miniApp = express(); // build a throwaway Express app to host the validator chain
      miniApp.use(express.json()); // enable JSON body parsing for the test app
      miniApp.post('/t', validator.validateString('message', { minLength: 1, maxLength: 50 }), validator.handleValidationErrors, (req, res) => res.json({ ok: true })); // wire validate -> handle -> terminal handler
      const res = await request(miniApp).post('/t').send({ message: 'hi' }); // POST a valid message to the mini app
      expect(res.status).toBe(200); // a valid payload must pass through to the handler
      expect(res.body.ok).toBe(true); // the terminal handler must have executed
    }); // end of validator success test

    it('responds 400 with a structured error array when validation fails', async () => { // assert the failure path
      const miniApp = express(); // build a throwaway Express app to host the validator chain
      miniApp.use(express.json()); // enable JSON body parsing for the test app
      miniApp.post('/t', validator.validateString('message', { minLength: 1, maxLength: 50 }), validator.handleValidationErrors, (req, res) => res.json({ ok: true })); // wire the same chain as above
      const res = await request(miniApp).post('/t').send({}); // POST an empty body to trigger validation failure
      expect(res.status).toBe(400); // a missing required field must yield HTTP 400
      expect(res.body.status).toBe(400); // the envelope status field must be 400
      expect(res.body.message).toBe('Validation failed'); // the envelope must report a validation failure
      expect(Array.isArray(res.body.errors)).toBe(true); // the errors property must be an array
      expect(res.body.errors[0].field).toBe('message'); // the first error must reference the 'message' field
      expect(typeof res.body.errors[0].message).toBe('string'); // each error must include a message string
    }); // end of validator failure test

    it('treats a field built with required:false as optional', async () => { // cover the optional (required=false) chain branch
      const miniApp = express(); // build a throwaway Express app
      miniApp.use(express.json()); // enable JSON body parsing
      miniApp.post('/opt', validator.validateString('nickname', { required: false, maxLength: 20 }), validator.handleValidationErrors, (req, res) => res.json({ ok: true })); // wire an optional-field chain
      const res = await request(miniApp).post('/opt').send({}); // POST without the optional field
      expect(res.status).toBe(200); // an absent optional field must still pass validation
      expect(res.body.ok).toBe(true); // the handler must execute
    }); // end of optional-field test

    it('runs validateNumeric custom min/max validators against real input', async () => { // exercise the numeric custom validators
      const miniApp = express(); // build a throwaway Express app
      miniApp.use(express.json()); // enable JSON body parsing
      miniApp.post('/num', validator.validateNumeric('age', { min: 1, max: 10 }), validator.handleValidationErrors, (req, res) => res.json({ ok: true })); // wire a bounded numeric chain
      const okRes = await request(miniApp).post('/num').send({ age: '5' }); // POST an in-range numeric value
      expect(okRes.status).toBe(200); // an in-range value must pass the custom min/max validators
      const badRes = await request(miniApp).post('/num').send({ age: '99' }); // POST an out-of-range numeric value
      expect(badRes.status).toBe(400); // an out-of-range value must fail validation
      expect(badRes.body.errors[0].field).toBe('age'); // the error must reference the 'age' field
    }); // end of numeric-validator test

    it('runs validateEmail against valid and invalid addresses', async () => { // exercise the email chain
      const miniApp = express(); // build a throwaway Express app
      miniApp.use(express.json()); // enable JSON body parsing
      miniApp.post('/email', validator.validateEmail('email'), validator.handleValidationErrors, (req, res) => res.json({ ok: true })); // wire an email chain
      const okRes = await request(miniApp).post('/email').send({ email: 'user@example.com' }); // POST a valid email
      expect(okRes.status).toBe(200); // a valid email must pass validation
      const badRes = await request(miniApp).post('/email').send({ email: 'not-an-email' }); // POST an invalid email
      expect(badRes.status).toBe(400); // an invalid email must fail validation
    }); // end of email-validator test

    it('exposes chain factories as express-validator ValidationChains', () => { // assert the factory return contracts
      const chain = validator.validateString('message', { minLength: 1, maxLength: 500 }); // build a string-validation chain
      expect(typeof chain).toBe('function'); // an express-validator chain is a callable middleware function
      expect(typeof chain.run).toBe('function'); // a ValidationChain exposes a run() method
      expect(typeof validator.validateOptional('o')).toBe('function'); // the optional factory must return a chain function
      expect(typeof validator.handleValidationErrors).toBe('function'); // the error aggregator must be a function
    }); // end of chain-factory test

    it('exposes sanitizer middleware as arrays and re-exports express-validator helpers', () => { // assert export shapes
      expect(Array.isArray(validator.sanitizeQuery)).toBe(true); // sanitizeQuery must be an array of middleware
      expect(Array.isArray(validator.sanitizeBody)).toBe(true); // sanitizeBody must be an array of middleware
      expect(typeof validator.body).toBe('function'); // body must be re-exported as a function
      expect(typeof validator.query).toBe('function'); // query must be re-exported as a function
      expect(typeof validator.param).toBe('function'); // param must be re-exported as a function
      expect(typeof validator.validationResult).toBe('function'); // validationResult must be re-exported as a function
      expect(typeof validator.matchedData).toBe('function'); // matchedData must be re-exported as a function
    }); // end of sanitizer/re-export test
  }); // end of validator suite

  describe('rateLimiter (middleware/rateLimiter.js, P2)', () => { // suite for the rate-limiter factory
    it('builds Express middleware from createRateLimiter and exposes preset limiters', () => { // assert the factory contracts
      expect(typeof rateLimiter.createRateLimiter).toBe('function'); // the factory itself must be a function
      expect(typeof rateLimiter.createRateLimiter()).toBe('function'); // calling the factory must return middleware
      expect(typeof rateLimiter.createRateLimiter({ windowMs: 1000, limit: 5 })).toBe('function'); // custom options must also yield middleware
      expect(typeof rateLimiter.defaultLimiter).toBe('function'); // the default limiter export must be middleware
      expect(typeof rateLimiter.strictLimiter).toBe('function'); // the strict limiter export must be middleware
    }); // end of rate-limiter test
  }); // end of rateLimiter suite
}); // end of middleware unit-test group
