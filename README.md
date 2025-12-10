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

## npm Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server with nodemon |
| `npm run generate-certs` | Generate self-signed SSL certificates |
| `npm test` | Run tests |

## License

MIT
