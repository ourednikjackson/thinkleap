#!/bin/bash
# db/scripts/setup-test-env.sh
set -e

echo "Setting up test environment..."

# Reset databases
echo "Resetting databases..."
psql -h localhost -U postgres -c "DROP DATABASE IF EXISTS thinkleap_test;"
psql -h localhost -U postgres -c "CREATE DATABASE thinkleap_test;"

# Run migrations for test environment
echo "Running migrations..."
NODE_ENV=test npx knex migrate:latest --knexfile=./knexfile.js --env test

# Seed test data
echo "Seeding test data..."
NODE_ENV=test npx knex seed:run --knexfile=./knexfile.js --env test

echo "Test environment setup complete!"