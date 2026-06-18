# Hello World - Secure Node.js Server

A secure Node.js HTTP/HTTPS server built with Express.js and comprehensive security middleware.

> Originally: hao-backprop-test - test project for backprop integration.

## Security Features

This application implements enterprise-grade security controls:

- **Security Headers** - Helmet.js middleware sets CSP, X-Frame-Options, HSTS, and more
- **Rate Limiting** - Express-rate-limit prevents DoS and brute force attacks (100 req/15min)
- **CORS Policy** - Configurable cross-origin resource sharing restrictions
- **Input Validation** - Express-validator sanitizes and validates all user input
- **HTTPS Support** - TLS encryption for secure data transmission

## Installation

```bash
# Install dependencies
npm install

# Generate development SSL certificates (optional, for HTTPS)
npm run generate-certs

# Start the server
npm start

# Development mode with auto-restart
npm run dev
```

## API Endpoints

The server exposes the following HTTP endpoints. All routes pass through the security middleware pipeline (Helmet → rate limiting → CORS → body parsing).

| Method | Path | Description | Success Response |
|--------|------|-------------|------------------|
| `GET` | `/` | Backward-compatible Hello World greeting | `200` · `text/plain` · `Hello, World!` |
| `GET` | `/good-evening` | Plain-text evening greeting | `200` · `text/plain` · `Good evening` |
| `GET` | `/health` | Health check for load balancers/monitoring (exempt from rate limiting) | `200` · `application/json` · `{ "status": "ok", "timestamp": <ms> }` |
| `POST` | `/echo` | Echoes a validated/sanitized `message` (and optional `name`) from the JSON body | `200` · `application/json` · `{ "status": 200, "message": "Echo successful", "data": { ... } }` |

> Note: `GET /` returns the exact payload `Hello, World!\n` and `GET /good-evening` returns `Good evening\n` (each with a trailing newline), both with `Content-Type: text/plain`.

## Environment Variables

Configure the application using these environment variables (see `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | HTTP server port |
| `HTTPS_PORT` | 3443 | HTTPS server port |
| `HTTPS_ENABLED` | false | Enable HTTPS server |
| `CORS_ORIGIN` | * | Allowed CORS origins (comma-separated) |
| `RATE_LIMIT_WINDOW_MS` | 900000 | Rate limit window in ms (15 min) |
| `RATE_LIMIT_MAX` | 100 | Max requests per window per IP |
| `SSL_KEY_PATH` | ./certs/key.pem | Path to TLS private key |
| `SSL_CERT_PATH` | ./certs/cert.pem | Path to TLS certificate |
| `NODE_ENV` | development | Environment mode |

## HTTPS Setup

### Development (Self-Signed Certificates)

```bash
# Generate self-signed certificates for development
npm run generate-certs

# Start server with HTTPS enabled
HTTPS_ENABLED=true npm start
```

### Production

1. Obtain SSL certificates from a Certificate Authority (e.g., Let's Encrypt)
2. Configure certificate paths via environment variables:
   ```bash
   SSL_KEY_PATH=/path/to/privkey.pem
   SSL_CERT_PATH=/path/to/fullchain.pem
   HTTPS_ENABLED=true
   ```

## Security Verification

Verify security headers are properly configured:

```bash
# Check security headers
curl -I http://localhost:3000

# Test rate limiting (should return 429 after 100 requests)
for i in {1..105}; do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000; done

# Test HTTPS (requires HTTPS_ENABLED=true)
curl -k https://localhost:3443

# Run vulnerability audit
npm audit
```

## Testing

Automated tests are written with [Jest](https://jestjs.io/) and [Supertest](https://github.com/ladjs/supertest). Test files live under the `__tests__/` directory and exercise the Express `app` factory in-process (no port binding required).

```bash
# Run the full test suite
npm test

# Run the test suite with a coverage report
npm run test:coverage
```

Coverage is collected from `app.js`, `routes/`, `middleware/`, and `config/`. The suite covers the API endpoints (including the `GET /good-evening` feature and the `GET /` backward-compatibility regression), security-header integration, validation and error-handling behavior, and 404 edge cases.

### Dependency Audit Hygiene

The `overrides` block in `package.json` pins `js-yaml` to `^4.2.0` for Jest's coverage tooling (the transitive `@istanbuljs/load-nyc-config` dependency). This override is required to keep `npm audit` at zero findings (Constraint C4): without it, `@istanbuljs/load-nyc-config` resolves `js-yaml@3.14.2`, which is flagged by [GHSA-h67p-54hq-rp68](https://github.com/advisories/GHSA-h67p-54hq-rp68) — a moderate quadratic-complexity denial-of-service affecting `js-yaml <= 4.1.1` — and that single advisory cascades into multiple audit findings across the Jest coverage dependency tree. Pinning `js-yaml` to its first patched release (`4.2.0`) clears them all. The override is development-only: it affects coverage instrumentation, never the production runtime, and changes no production dependency.

## npm Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server with nodemon |
| `npm run generate-certs` | Generate self-signed SSL certificates |
| `npm test` | Run the Jest test suite |
| `npm run test:coverage` | Run the test suite with a coverage report |

## License

MIT
