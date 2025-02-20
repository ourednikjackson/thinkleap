#!/bin/bash
set -e

# Create databases
psql -U postgres <<EOF
CREATE DATABASE thinkleap;
CREATE DATABASE thinkleap_test;
EOF

# Run migrations
cd ..
npx knex migrate:latest