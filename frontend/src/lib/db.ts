// Database configuration and client for JSTOR integration
import type { Pool, QueryResult, QueryConfig } from 'pg';

// Database client interface
export interface DbClient {
  query<T extends Record<string, any>>(
    queryTextOrConfig: string | QueryConfig,
    values?: any[]
  ): Promise<QueryResult<T>>;
  testConnection(): Promise<void>;
}

let pool: Pool | null = null;

// Initialize the database pool
async function initializePool() {
  if (!pool) {
    try {
      // Check if we're in a server context
      if (typeof window !== 'undefined') {
        throw new Error('Database operations can only be performed on the server');
      }

      // Get database configuration from environment
      const dbUrl = process.env.JSTOR_DATABASE_URL || process.env.DATABASE_URL;
      if (!dbUrl) {
        throw new Error('Database URL not configured');
      }

      // Dynamically import pg in a server context
      const pg = await import('pg');
      
      pool = new pg.Pool({
        connectionString: dbUrl,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      });

      // Add error handler for database connection issues
      pool.on('error', (err) => {
        console.error('Database connection error:', err);
        pool = null; // Reset pool on error
      });
    } catch (error) {
      console.error('Error initializing database pool:', error);
      throw error;
    }
  }
  return pool;
}

// Export the database interface
export const db: DbClient = {
  query: async <T extends Record<string, any>>(
    queryTextOrConfig: string | QueryConfig,
    values?: any[]
  ): Promise<QueryResult<T>> => {
    const pool = await initializePool();
    return pool.query(queryTextOrConfig, values);
  },
  testConnection: async () => {
    try {
      const pool = await initializePool();
      await pool.query('SELECT NOW()');
      console.log('Successfully connected to the database');
    } catch (error) {
      console.error('Failed to connect to the database:', error);
      throw error;
    }
  },
};
