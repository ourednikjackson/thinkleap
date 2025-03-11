// Application configuration settings
const environment = process.env.NODE_ENV || 'development';

export const config = {
  // Base application settings
  nodeEnv: environment,
  port: parseInt(process.env.PORT || '3001', 10),
  
  // API settings
  apiPrefix: '/api',
  apiVersion: 'v1',
  
  // CORS settings
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  
  // JWT settings
  jwtSecret: process.env.JWT_SECRET || 'your-default-jwt-secret-for-dev-only',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  
  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
  },
  
  // Logging
  logging: {
    level: environment === 'development' ? 'debug' : 'info',
    format: environment === 'development' ? 'dev' : 'combined',
  },
  
  // OAI-PMH settings
  oaiPmh: {
    defaultHarvestInterval: 24, // hours
    maxConcurrentHarvests: 2,
  },
};

export default config;
