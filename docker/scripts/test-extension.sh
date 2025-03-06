#!/bin/bash
# Script to enable extension testing and send test requests

# Navigate to project root
export PROJECT_ROOT=$(cd "$(dirname "$0")/../.." && pwd)
echo "Using project root: $PROJECT_ROOT"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "Error: Docker is not running. Please start Docker and try again."
  exit 1
fi

# Default values
DEFAULT_API_KEY="test-api-key"
DEFAULT_DURATION=3600 # 1 hour in seconds

# Parse command line arguments
API_KEY=${1:-$DEFAULT_API_KEY}
DURATION=${2:-$DEFAULT_DURATION}

echo "Starting extension testing with API key: $API_KEY for $DURATION seconds"

# Set environment variables for the Docker container
CONTAINER_NAME=$(docker ps --filter "name=thinkleap-backend" --format "{{.Names}}")

if [ -z "$CONTAINER_NAME" ]; then
  echo "Error: ThinkLeap backend container not found. Is the application running?"
  echo "Use './start-dev.sh' to start the development environment first."
  exit 1
fi

echo "Found backend container: $CONTAINER_NAME"

# Configure environment for extension testing
echo "Configuring extension testing environment..."
docker exec -it $CONTAINER_NAME /bin/sh -c "export EXTENSION_TESTING=true && export EXTENSION_API_KEY=$API_KEY && export LOG_DIR=/app/logs"

# Create test logs directory if it doesn't exist
docker exec -it $CONTAINER_NAME /bin/sh -c "mkdir -p /app/logs/extension"

# Enable extension logging
echo "Enabling extension logging for $DURATION seconds..."
NODE_COMMAND="const { enableExtensionLogging } = require('./dist/middleware/extension-testing.middleware'); enableExtensionLogging($DURATION);"
docker exec -it $CONTAINER_NAME /bin/sh -c "cd /app && node -e \"$NODE_COMMAND\""

# Print info about how to test the extension
echo ""
echo "===================== EXTENSION TESTING ENABLED ====================="
echo "Extension testing has been enabled for $DURATION seconds."
echo ""
echo "API Key: $API_KEY"
echo ""
echo "Test the extension API with the following endpoints:"
echo "- GET  http://localhost:4000/api/extension/test"
echo "- POST http://localhost:4000/api/extension/upload/file (with PDF file)"
echo "- POST http://localhost:4000/api/extension/upload/url (with URL in JSON body)"
echo ""
echo "All requests require the header: 'x-api-key: $API_KEY'"
echo ""
echo "Logs are being saved to the container at: /app/logs/extension/extension-testing.log"
echo "You can view logs with: docker exec -it $CONTAINER_NAME cat /app/logs/extension/extension-testing.log"
echo "======================================================================"

# Example curl commands for testing
if command -v curl &> /dev/null; then
  echo ""
  echo "Example curl commands for testing:"
  echo ""
  echo "Test connection:"
  echo "curl -H \"x-api-key: $API_KEY\" http://localhost:4000/api/extension/test"
  echo ""
  echo "Upload URL:"
  echo "curl -X POST -H \"Content-Type: application/json\" -H \"x-api-key: $API_KEY\" -d '{\"url\":\"https://example.com/sample.pdf\"}' http://localhost:4000/api/extension/upload/url"
  echo ""
  echo "Upload file:"
  echo "curl -X POST -H \"x-api-key: $API_KEY\" -F \"file=@/path/to/your/file.pdf\" http://localhost:4000/api/extension/upload/file"
fi