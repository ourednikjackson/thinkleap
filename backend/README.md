# ThinkLeap Backend API

Backend API for the ThinkLeap platform, providing both Chrome extension functionality and institutional research paper access with SAML authentication and OAI-PMH harvesting capabilities.

## Features

### Chrome Extension Features
- PDF handling via file upload or URL
- Academic database access with session cookies and authentication headers
- Secure API key authentication
- CORS enabled for Chrome extension integration
- Efficient file processing with streaming and async operations
- Comprehensive error handling

### Institutional Access Features
- SAML/Shibboleth authentication for institutional single sign-on
- OAI-PMH harvesting for library catalog integration
- Institutional subscription management
- Metadata enrichment via Crossref API
- Research paper search with access control
- User access tracking for analytics

## Setup

### Prerequisites

- Node.js (v18+)
- npm or yarn
- TypeScript (v5.x+)
- PostgreSQL (v14+)
- Redis (v6+)
- Docker (recommended for development with Shibboleth SP)

### Installation

1. Clone the repository
```bash
git clone https://github.com/your-username/thinkleap.git
cd thinkleap/backend
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables by creating a `.env` file:
```
# Basic setup
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=thinkleap
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_URL=redis://localhost:6379

# JWT Authentication
JWT_SECRET=your-jwt-secret-change-this-in-production
JWT_REFRESH_SECRET=your-jwt-refresh-secret-change-this-in-production
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=7d

# Session management (for SAML)
SESSION_SECRET=your-session-secret-change-this-in-production
SESSION_MAX_AGE=86400000

# SAML configuration
SAML_ISSUER=http://localhost/saml
SAML_TECHNICAL_CONTACT=support@thinkleap.io

# External APIs
CROSSREF_EMAIL=your-email@example.com

# Extension configuration
EXTENSION_API_KEY=your-api-key
EXTENSION_UPLOAD_PATH=./uploads
TARGET_SITE_URL=https://targetsite.com
TARGET_SITE_API_URL=https://api.targetsite.com
TARGET_SITE_API_KEY=your-target-site-api-key
```

4. Run database migrations
```bash
cd ../db
npm run migrate
cd ../backend
```

5. Build and start the server
```bash
# For development with hot reload
npm run dev

# For production
npm run build
npm run start
```

### Using Docker

The easiest way to set up the entire stack with SAML is using Docker:

```bash
cd ../docker/dev
docker-compose up
```

This will start:
- PostgreSQL database
- Redis cache
- Backend API server
- Frontend Next.js app
- Shibboleth Service Provider with Apache (for SAML authentication)

## API Endpoints

### Extension Endpoints

#### POST /api/extension/upload/file

Upload a PDF file directly from the extension.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Headers:
  - `x-api-key`: Your API key
- Body:
  - `file`: PDF file (max 50MB)

**Response:**
```json
{
  "status": "success",
  "redirect": "https://targetsite.com/view/123e4567-e89b-12d3-a456-426614174000"
}
```

#### POST /api/extension/upload/url

Submit a URL to a PDF that the server will fetch and process.

**Request:**
- Method: `POST`
- Content-Type: `application/json`
- Headers:
  - `x-api-key`: Your API key
- Body:
```json
{
  "url": "https://academic-database.com/content/123/paper.pdf",
  "headers": {
    "User-Agent": "Mozilla/5.0...",
    "Referer": "https://academic-database.com"
  },
  "cookies": "session=abc123; auth=xyz789",
  "targetSite": "https://targetsite.com" // Optional - override default target
}
```

**Response:**
```json
{
  "status": "success",
  "redirect": "https://targetsite.com/view/123e4567-e89b-12d3-a456-426614174000"
}
```

### SAML Authentication Endpoints

#### GET /api/auth/saml/login/:institution

Initiates a SAML login for the specified institution.

**Response:**
- Redirects to the institution's Identity Provider (IdP) login page

#### POST /api/auth/saml/callback/:institution

SAML assertion consumer service (ACS) endpoint.

**Request:**
- Response from Identity Provider
- Body:
  - `SAMLResponse`: SAML assertion (base64 encoded)
  - `RelayState`: Optional state to return to after authentication

**Response:**
- Redirects to frontend with established session

#### GET /api/auth/saml/logout

Initiates a SAML logout.

**Response:**
- Redirects to the Identity Provider logout service

#### GET /api/auth/saml/metadata/:institution

Returns the Service Provider metadata for the specified institution.

**Response:**
- Content-Type: `text/xml`
- SAML metadata XML

#### GET /api/auth/saml/institutions

Returns list of configured institutions for SAML login.

**Response:**
```json
{
  "institutions": [
    {
      "entityID": "https://idp.university.edu/idp/shibboleth",
      "name": "Example University",
      "domain": "university.edu"
    }
  ]
}
```

### Metadata and Search Endpoints

#### GET /api/metadata/search

Search harvested metadata records.

**Request:**
- Method: `GET`
- Query Parameters:
  - `query`: Search term
  - `page`: Page number (default: 1)
  - `limit`: Results per page (default: 20)
  - `startDate`: Filter by start date (YYYY-MM-DD)
  - `endDate`: Filter by end date (YYYY-MM-DD)
  - `providers`: Filter by providers (comma-separated)
  - `openAccessOnly`: Filter to only open access (true/false)
  - `sortBy`: Sort by field (relevance/date/title)
  - `sortOrder`: Sort order (asc/desc)

**Response:**
```json
{
  "results": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "Example Research Paper",
      "abstract": "This is a sample abstract...",
      "authors": [{"name": "John Smith", "orcid": "0000-0001-2345-6789"}],
      "publicationDate": "2023-01-15",
      "doi": "10.1234/example.2023",
      "url": "https://doi.org/10.1234/example.2023",
      "isOpenAccess": false,
      "provider": "Elsevier",
      "hasAccess": true,
      "accessUrl": "https://doi.org/10.1234/example.2023"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

#### GET /api/metadata/records/:id

Get details for a specific metadata record.

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Example Research Paper",
  "abstract": "This is a sample abstract...",
  "authors": [{"name": "John Smith", "orcid": "0000-0001-2345-6789"}],
  "publicationDate": "2023-01-15",
  "doi": "10.1234/example.2023",
  "url": "https://doi.org/10.1234/example.2023",
  "isOpenAccess": false,
  "provider": "Elsevier",
  "keywords": "machine learning, artificial intelligence",
  "additionalMetadata": {}
}
```

#### POST /api/metadata/harvest/:sourceId

Trigger harvesting for a specific OAI-PMH source.

**Response:**
```json
{
  "success": true,
  "message": "Harvesting initiated successfully"
}
```

## Error Handling

The API returns appropriate HTTP status codes and error messages:

```json
{
  "status": "error",
  "message": "PDF fetch failed: Document not accessible"
}
```

Common error codes:
- `400`: Bad request (invalid parameters or format)
- `401`: Unauthorized (missing API key or session)
- `403`: Forbidden (invalid API key or insufficient access rights)
- `404`: Not found (resource doesn't exist)
- `413`: Payload too large (file size > 50MB)
- `429`: Too many requests (rate limit exceeded)
- `500`: Server error (processing failed)

## Chrome Extension Integration

The extension should use the Fetch API to communicate with this backend:

```javascript
// Example: Upload PDF from URL
async function sendPdfUrl(url, sessionCookies) {
  const response = await fetch('https://api.thinkleap.com/api/extension/upload/url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'your-api-key'
    },
    body: JSON.stringify({
      url,
      cookies: sessionCookies
    })
  });
  
  const data = await response.json();
  
  if (data.status === 'success') {
    // Redirect to the target site
    window.location.href = data.redirect;
  } else {
    // Handle error
    console.error(data.message);
  }
}
```

## SAML Configuration

### Registering Service Provider with Identity Providers

1. Generate metadata for your Service Provider:
   ```
   curl https://your-domain.com/api/auth/saml/metadata/example-institution
   ```

2. Provide this metadata to your institution's Identity Provider administrators

3. Configure your Identity Provider in the database:
   ```sql
   -- Add institution
   INSERT INTO institutions (id, name, domain, active, created_at, updated_at)
   VALUES (
     gen_random_uuid(),
     'Example University',
     'example.edu',
     true,
     CURRENT_TIMESTAMP,
     CURRENT_TIMESTAMP
   );

   -- Add SAML Identity Provider
   INSERT INTO saml_identity_providers (
     id, institution_id, entity_id, certificate, sso_login_url, 
     sso_logout_url, is_federated, federation_name, created_at, updated_at
   )
   VALUES (
     gen_random_uuid(),
     '123e4567-e89b-12d3-a456-426614174000', -- institution_id from above
     'https://idp.example.edu/idp/shibboleth',
     '-----BEGIN CERTIFICATE-----\n...certificate...\n-----END CERTIFICATE-----',
     'https://idp.example.edu/idp/profile/SAML2/Redirect/SSO',
     'https://idp.example.edu/idp/profile/SAML2/Redirect/SLO',
     false,
     null,
     CURRENT_TIMESTAMP,
     CURRENT_TIMESTAMP
   );
   ```

## OAI-PMH Harvesting Configuration

1. Configure a new harvesting source:
   ```sql
   INSERT INTO harvest_sources (
     id, institution_id, provider, base_url, metadata_prefix, 
     set_spec, active, batch_size, harvest_frequency, created_at, updated_at
   )
   VALUES (
     gen_random_uuid(),
     '123e4567-e89b-12d3-a456-426614174000', -- institution_id
     'University Repository',
     'https://repository.example.edu/oai/request',
     'oai_dc',
     'publications',
     true,
     100,
     'daily',
     CURRENT_TIMESTAMP,
     CURRENT_TIMESTAMP
   );
   ```

2. Trigger manual harvesting:
   ```
   curl -X POST https://your-domain.com/api/metadata/harvest/source-id-from-above
   ```

3. Automatic harvesting runs daily at 1 AM based on each source's frequency setting

## Security Considerations

- API keys are required for extension endpoints
- SAML authentication uses secure signed assertions
- HTTPS is strictly required in production
- File validation prevents non-PDF uploads
- Redis session storage with encryption
- PostgreSQL database encryption at rest
- Rate limiting prevents abuse
- Temporary files are cleaned up after processing
- All queries use parameterized statements to prevent SQL injection

## License

[MIT](LICENSE)