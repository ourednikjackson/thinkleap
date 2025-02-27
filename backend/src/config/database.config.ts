// backend/src/config/database.config.ts

/**
 * Load database configuration from environment variables with fallbacks
 */
export function getDatabaseConfig() {
    return {
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'thinkleap',
      password: process.env.DB_PASSWORD || 'postgres',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      ssl: process.env.DB_SSL === 'true'
    };
  }
  
  /**
   * Get environment-specific database config
   */
  export function getEnvironmentDatabaseConfig() {
    // Check if we're in test mode
    if (process.env.NODE_ENV === 'test') {
      return {
        user: process.env.TEST_DB_USER || 'postgres',
        host: process.env.TEST_DB_HOST || 'localhost',
        database: process.env.TEST_DB_NAME || 'thinkleap_test',
        password: process.env.TEST_DB_PASSWORD || 'postgres',
        port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
        ssl: process.env.TEST_DB_SSL === 'true'
      };
    }
    
    return getDatabaseConfig();
  }