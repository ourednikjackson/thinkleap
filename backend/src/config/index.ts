// backend/src/config/index.ts
import { DatabaseConfig, RedisConfig, Config } from './types';
import jwt from 'jsonwebtoken';
// Load environment variables with proper precedence
function getEnvVar(key: string, defaultValue?: string): string {
  return process.env[key] || defaultValue || '';
}

function getEnvVarAsNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

function getEnvVarAsBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
}

// Build the database config
const dbConfig: DatabaseConfig = {
  host: getEnvVar('DB_HOST', 'localhost'),
  port: getEnvVarAsNumber('DB_PORT', 5432),
  name: getEnvVar('DB_NAME', 'thinkleap'),
  user: getEnvVar('DB_USER', 'postgres'),
  password: getEnvVar('DB_PASSWORD', 'postgres'),
  // Test database config
  test: {
    host: getEnvVar('TEST_DB_HOST', 'localhost'),
    port: getEnvVarAsNumber('TEST_DB_PORT', 5432),
    name: getEnvVar('TEST_DB_NAME', 'thinkleap_test'),
    user: getEnvVar('TEST_DB_USER', 'postgres'),
    password: getEnvVar('TEST_DB_PASSWORD', 'postgres'),
  }
};

// Build the Redis config
const redisConfig: RedisConfig = {
  url: getEnvVar('REDIS_URL', 'redis://localhost:6379'),
  host: getEnvVar('REDIS_HOST', 'localhost'),
  port: getEnvVarAsNumber('REDIS_PORT', 6379),
  password: getEnvVar('REDIS_PASSWORD', undefined)
};

// Create the full configuration object
export const config: Config = {
  env: getEnvVar('NODE_ENV', 'development'),
  port: getEnvVarAsNumber('PORT', 3001),
  db: dbConfig,
  redis: redisConfig,
  cors: {
    origin: getEnvVar('CORS_ORIGIN', '*')
  },
  api: {
    pubmed: {
      key: getEnvVar('PUBMED_API_KEY')
    },
    crossref: {
      email: getEnvVar('CROSSREF_EMAIL', 'support@thinkleap.io')
    }
  },
  jwt: {
    secret: getEnvVar('JWT_SECRET', 'your-jwt-secret-do-not-use-in-production'),
    refreshSecret: getEnvVar('JWT_REFRESH_SECRET', 'your-jwt-refresh-secret-do-not-use-in-production'),
    accessTokenExpiry: getEnvVar('JWT_ACCESS_TOKEN_EXPIRY', '15m'),
    refreshTokenExpiry: getEnvVar('JWT_REFRESH_TOKEN_EXPIRY', '7d')
  },
  session: {
    secret: getEnvVar('SESSION_SECRET', 'your-session-secret-do-not-use-in-production'),
    maxAge: getEnvVarAsNumber('SESSION_MAX_AGE', 24 * 60 * 60 * 1000) // 24 hours default
  },
  saml: {
    issuer: getEnvVar('SAML_ISSUER', 'thinkleap'),
    callbackUrl: getEnvVar('SAML_CALLBACK_URL', '/api/auth/saml/callback'),
    logoutUrl: getEnvVar('SAML_LOGOUT_URL', '/api/auth/saml/logout/callback'),
    technicalContact: getEnvVar('SAML_TECHNICAL_CONTACT', 'support@thinkleap.io'),
    defaultIdpCert: getEnvVar('SAML_DEFAULT_IDP_CERT')
  },
  targetSite: {
    baseUrl: getEnvVar('TARGET_SITE_URL', 'https://targetsite.com'),
    apiUrl: getEnvVar('TARGET_SITE_API_URL'),
    apiKey: getEnvVar('TARGET_SITE_API_KEY')
  },
  extension: {
    uploadPath: getEnvVar('EXTENSION_UPLOAD_PATH', './uploads'),
    apiKey: getEnvVar('EXTENSION_API_KEY', 'your-api-key-change-this-in-production'),
    maxFileSize: getEnvVarAsNumber('EXTENSION_MAX_FILE_SIZE', 50 * 1024 * 1024) // 50MB default
  }
};

// For backward compatibility

// Export a function to get a specific environment's configuration
export function getConfig(env = process.env.NODE_ENV): Config {
  // You could add environment-specific overrides here
  return config;
}

export default config;