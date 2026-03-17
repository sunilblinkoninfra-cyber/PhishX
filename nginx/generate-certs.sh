#!/bin/bash
# PhishX — Generate self-signed TLS certificate for staging
# DevOps Agent: AI Co-worker
# For production: replace with Let's Encrypt via Certbot

set -e
DIR="$(cd "$(dirname "$0")" && pwd)/certs"
mkdir -p "$DIR"

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$DIR/phishx.key" \
  -out "$DIR/phishx.crt" \
  -subj "/C=IN/ST=Delhi/L=Delhi/O=PhishX/OU=Security/CN=staging.phishx.io" \
  -addext "subjectAltName=DNS:staging.phishx.io,DNS:localhost,IP:127.0.0.1"

chmod 600 "$DIR/phishx.key"
echo "Certs generated at $DIR"
echo "For production: use certbot --nginx -d staging.phishx.io"
