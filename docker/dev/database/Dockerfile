
FROM postgres:14-alpine

# Add health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD pg_isready -U thinkleap_user -d thinkleap

# Create test database during initialization
COPY ./create-test-db.sh /docker-entrypoint-initdb.d/