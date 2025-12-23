#!/bin/bash
#
# Self-Signed SSL Certificate Generator for Development
#
# This script generates a 2048-bit RSA private key and self-signed X.509 certificate
# for local HTTPS development and testing. The certificates are valid for 365 days.
#
# Usage:
#   bash certs/generate-certs.sh
#   OR
#   npm run generate-certs
#
# Output files:
#   certs/key.pem  - Private key (chmod 600)
#   certs/cert.pem - Self-signed certificate (chmod 644)
#

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Define output file paths
KEY_FILE="${SCRIPT_DIR}/key.pem"
CERT_FILE="${SCRIPT_DIR}/cert.pem"

echo "Generating self-signed SSL certificate for development..."

# Generate 2048-bit RSA private key
openssl genrsa -out "${KEY_FILE}" 2048

# Generate self-signed certificate (valid for 365 days)
# Using -subj for non-interactive generation
openssl req -new -x509 \
    -key "${KEY_FILE}" \
    -out "${CERT_FILE}" \
    -days 365 \
    -subj "/C=US/ST=Local/L=Local/O=Development/CN=localhost"

# Set secure permissions
chmod 600 "${KEY_FILE}"  # Private key: owner read/write only
chmod 644 "${CERT_FILE}" # Certificate: world readable

echo ""
echo "✓ Certificate generation complete!"
echo ""
echo "Files created:"
echo "  Private Key:  ${KEY_FILE}"
echo "  Certificate:  ${CERT_FILE}"
echo ""
echo "To enable HTTPS, set in your environment:"
echo "  export HTTPS_ENABLED=true"
echo ""
echo "WARNING: These certificates are for development only!"
echo "         Do not use in production environments."
