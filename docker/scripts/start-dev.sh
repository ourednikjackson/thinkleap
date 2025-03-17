#!/bin/bash

# Navigate to project root
export PROJECT_ROOT=$(cd "$(dirname "$0")/../.." && pwd)

echo "Using project root: $PROJECT_ROOT"

# Use absolute paths
docker compose -f "$PROJECT_ROOT/docker/docker-compose.base.yml" \
               -f "$PROJECT_ROOT/docker/dev/docker-compose.yml" \
               up --build