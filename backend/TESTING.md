# ThinkLeap API Testing Guide

These examples demonstrate how to test the ThinkLeap API endpoints using `curl`.

## Prerequisites

- The backend server should be running (e.g., on `http://localhost:3001`)
- API key should be configured in the `.env` file for extension endpoints
- PostgreSQL database should be set up and migrations applied
- Redis server should be running for session management

## Testing File Upload Endpoint

Upload a local PDF file:

```bash
curl -X POST \
  http://localhost:3001/api/extension/upload/file \
  -H "x-api-key: your-api-key" \
  -F "file=@/path/to/your/document.pdf" \
  -v
```

Expected response:

```json
{
  "status": "success",
  "redirect": "https://targetsite.com/view/123e4567-e89b-12d3-a456-426614174000"
}
```

## Testing URL Upload Endpoint

Submit a URL to fetch a PDF with cookies:

```bash
curl -X POST \
  http://localhost:3001/api/extension/upload/url \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "url": "https://academic-database.com/content/123/paper.pdf",
    "headers": {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Referer": "https://academic-database.com/search"
    },
    "cookies": "session=abc123; auth=xyz789"
  }' \
  -v
```

Expected response:

```json
{
  "status": "success",
  "redirect": "https://targetsite.com/view/123e4567-e89b-12d3-a456-426614174000"
}
```

## Testing Error Handling

### Invalid API Key

```bash
curl -X POST \
  http://localhost:3001/api/extension/upload/url \
  -H "Content-Type: application/json" \
  -H "x-api-key: invalid-key" \
  -d '{ "url": "https://example.com/test.pdf" }' \
  -v
```

Expected response (403 Forbidden):

```json
{
  "status": "error",
  "message": "Invalid API key"
}
```

### Invalid URL Format

```bash
curl -X POST \
  http://localhost:3001/api/extension/upload/url \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{ "url": "not-a-valid-url" }' \
  -v
```

Expected response (400 Bad Request):

```json
{
  "status": "error",
  "message": "Invalid URL format"
}
```

### Non-PDF URL

Test with a URL that doesn't return a PDF:

```bash
curl -X POST \
  http://localhost:3001/api/extension/upload/url \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{ "url": "https://example.com" }' \
  -v
```

Expected response (400 Bad Request):

```json
{
  "status": "error",
  "message": "URL did not return a PDF"
}
```

## Testing with Real Academic Databases

### JSTOR Example

```bash
curl -X POST \
  http://localhost:3001/api/extension/upload/url \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "url": "https://www.jstor.org/stable/pdf/10.2307/123456.pdf",
    "cookies": "JSESSIONID=ABC123; BIGipServerJSTOR=DEF456",
    "headers": {
      "Referer": "https://www.jstor.org/stable/10.2307/123456",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
  }' \
  -v
```

### ProQuest Example

```bash
curl -X POST \
  http://localhost:3001/api/extension/upload/url \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "url": "https://www.proquest.com/pdfdownload/123456",
    "cookies": "JSESSIONID=ABC123; MACHINE_COOKIE=DEF456",
    "headers": {
      "Referer": "https://www.proquest.com/docview/123456",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
  }' \
  -v
```

## Testing SAML Authentication

### Testing the SAML Metadata Endpoint

Retrieve the SAML metadata for a specific institution:

```bash
curl -X GET \
  http://localhost:3001/api/auth/saml/metadata/example-institution \
  -v
```

This should return an XML document with the Service Provider metadata that you can provide to the Identity Provider.

### Testing SAML Login Initiation

This can't be fully tested with curl as it involves browser redirects, but you can see the initial redirect:

```bash
curl -X GET \
  http://localhost:3001/api/auth/saml/login/example-institution \
  -v
```

The response should be a 302 redirect to the institution's Identity Provider login page.

### Testing Available Institutions

Get a list of configured institutions for SAML login:

```bash
curl -X GET \
  http://localhost:3001/api/auth/saml/institutions \
  -v
```

Expected response:

```json
{
  "institutions": [
    {
      "entityID": "https://idp.example.edu/idp/shibboleth",
      "name": "Example University",
      "domain": "example.edu"
    }
  ]
}
```

## Testing Metadata and OAI-PMH

### Testing Metadata Search

```bash
curl -X GET \
  "http://localhost:3001/api/metadata/search?query=machine%20learning&page=1&limit=10" \
  -H "Authorization: Bearer your-token-here" \
  -v
```

Expected response:

```json
{
  "results": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "Machine Learning Applications in Research",
      "abstract": "This paper explores...",
      "authors": [{"name": "John Smith"}],
      "publicationDate": "2023-05-15",
      "url": "https://example.com/paper.pdf",
      "hasAccess": true,
      "accessUrl": "https://example.com/paper.pdf"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

### Testing Metadata Record Retrieval

```bash
curl -X GET \
  http://localhost:3001/api/metadata/records/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer your-token-here" \
  -v
```

### Testing Access Logging

```bash
curl -X POST \
  http://localhost:3001/api/metadata/records/123e4567-e89b-12d3-a456-426614174000/access \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token-here" \
  -d '{
    "accessType": "download"
  }' \
  -v
```

### Testing OAI-PMH Harvesting (Admin Only)

Trigger harvesting from a configured source:

```bash
curl -X POST \
  http://localhost:3001/api/metadata/harvest/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer admin-token-here" \
  -v
```

Seed initial metadata for testing:

```bash
curl -X POST \
  http://localhost:3001/api/metadata/seed \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin-token-here" \
  -d '{
    "institutionId": "123e4567-e89b-12d3-a456-426614174000",
    "provider": "Crossref",
    "limit": 500
  }' \
  -v
```

## Automated Tests

For automated testing with Jest:

```bash
# Install test dependencies
npm install --save-dev jest supertest ts-jest @types/jest @types/supertest

# Create a test configuration
echo '{
  "preset": "ts-jest",
  "testEnvironment": "node",
  "roots": ["<rootDir>/tests"],
  "testMatch": ["**/*.test.ts"]
}' > jest.config.js

# Run tests
npm test
```

Example test file (tests/auth.test.ts):

```typescript
import request from 'supertest';
import { app } from '../src/app';

describe('Authentication API', () => {
  it('should reject requests with invalid API key', async () => {
    const response = await request(app)
      .post('/api/extension/upload/url')
      .set('x-api-key', 'invalid-key')
      .send({ url: 'https://example.com/test.pdf' });
    
    expect(response.status).toBe(403);
    expect(response.body.status).toBe('error');
  });
});