#!/bin/bash
set -e

echo "Building CodeSync AI multi-language execution sandbox..."
docker build -t codesync-sandbox:latest -f Dockerfile.sandbox .
echo "✅ codesync-sandbox:latest built successfully."
