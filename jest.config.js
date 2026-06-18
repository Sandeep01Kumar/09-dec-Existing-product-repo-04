'use strict'; // enable strict mode for safer JavaScript semantics

/** @type {import('jest').Config} */ // type hint so editors validate the Jest config shape
module.exports = {                                   // export the Jest configuration object (CommonJS)
  testEnvironment: 'node',                           // run tests in a Node.js environment (HTTP API needs no DOM)
  testMatch: ['**/__tests__/**/*.test.js'],          // discover test files in any __tests__ directory ending with .test.js
  collectCoverageFrom: [                             // restrict coverage instrumentation to first-party source modules
    'app.js',                                        // Express application factory under test
    'routes/**/*.js',                                // route handlers, including the new GET /good-evening endpoint
    'middleware/**/*.js',                            // cross-cutting middleware (errorHandler, validator, rateLimiter)
    'config/**/*.js',                                // security and HTTPS configuration modules
    '!**/node_modules/**'                            // never instrument third-party dependencies
  ],
  coveragePathIgnorePatterns: [                      // exclude modules with process-level side effects from coverage
    '/node_modules/',                                // standard ignore for installed dependencies
    'server.js'                                      // server.js binds ports and registers signal handlers; excluded by design
  ],
  coverageDirectory: 'coverage',                     // emit coverage artifacts into the coverage/ directory (build output)
  coverageReporters: ['text', 'lcov'],               // print a console summary and produce an lcov report
  coverageThreshold: {                               // enforce risk-prioritized minimum coverage (AAP 0.7.2)
    global: {                                        // baseline thresholds applied across all instrumented files
      branches: 70,                                  // minimum acceptable branch coverage
      functions: 80,                                 // minimum acceptable function coverage
      lines: 80,                                     // minimum acceptable line coverage
      statements: 80                                 // minimum acceptable statement coverage
    },
    './routes/index.js': {                           // highest priority: user-facing route contract (P0 feature + regression)
      branches: 90,                                  // stricter branch coverage for the route layer
      functions: 100,                                // every route handler must be exercised by a test
      lines: 95,                                     // near-total line coverage for the route layer
      statements: 95                                 // near-total statement coverage for the route layer
    }
  },
  verbose: true,                                     // print individual test results for clearer CI output
  clearMocks: true                                   // reset mock state between tests to keep cases isolated
};
