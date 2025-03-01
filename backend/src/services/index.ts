// backend/src/services/index.ts
import { config } from '../config';
import { Logger } from './logger';
import { CacheService } from './cache';
import { DatabaseService } from './database/database.service';

// Services singleton
let databaseService: DatabaseService | null = null;
let cacheService: CacheService | null = null;
let logger: Logger | null = null;

// Format the database config
const dbConfig = {
  user: config.db.user,
  host: config.db.host,
  database: config.db.name,
  password: config.db.password,
  port: config.db.port,
  ssl: config.db.ssl
};

// Initialize services
export function initServices() {
  logger = new Logger();
  cacheService = new CacheService(config.redis.url);
  databaseService = new DatabaseService(dbConfig);
  
  return { logger, cacheService, databaseService };
}

// Get initialized services
export function getServices() {
  if (!databaseService || !cacheService || !logger) {
    return initServices();
  }
  
  return { logger, cacheService, databaseService };
}

// Clean up services
export async function cleanupServices() {
  if (databaseService) {
    await databaseService.disconnect();
  }
}