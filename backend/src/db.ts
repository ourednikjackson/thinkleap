import knex from 'knex';
// Directly use the database config since the database.ts file was renamed
const config = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'thinkleap_dev',
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: './migrations',
  },
};

// Create and export the database connection
export const db = knex(config);

// Helper function to check if the database is connected
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await db.raw('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
}

// Types for database tables
export interface OaiPmhSource {
  id: number;
  name: string;
  oai_endpoint: string;
  metadata_prefix: string;
  set_spec?: string;
  harvest_interval_hours: number;
  last_harvested_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OaiPmhHarvestLog {
  id: number;
  source_id: number;
  start_time: string;
  end_time?: string;
  status: 'running' | 'completed' | 'failed';
  records_processed: number;
  records_added: number;
  records_updated: number;
  records_failed: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface HarvestedArticle {
  id: number;
  record_id: string;
  source_id: number;
  title: string;
  authors: string;
  abstract?: string;
  pub_date?: string;
  journal?: string;
  url?: string;
  doi?: string;
  keywords?: string;
  full_metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Export types for use in other files
export type { Knex } from 'knex';
