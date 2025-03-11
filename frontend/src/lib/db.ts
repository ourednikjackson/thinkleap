// Database connection for frontend
import knex from 'knex';
import { logger } from './logger';

// Use environment variables or defaults for database connection
const dbConfig = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'thinkleap',
  },
  pool: {
    min: 2,
    max: 10
  },
  // Helps identify and debug slow queries in development
  debug: process.env.NODE_ENV !== 'production'
};

// Initialize database connection
let _db: any = null;

export function getDb() {
  if (!_db) {
    try {
      _db = knex(dbConfig);
      logger.info('Database connection initialized');
    } catch (error) {
      logger.error('Failed to initialize database connection', error);
      throw error;
    }
  }
  return _db;
}

// Export a singleton instance
export const db = getDb();
