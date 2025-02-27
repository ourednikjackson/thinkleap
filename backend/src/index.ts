// backend/src/index.ts
import * as dotenv from 'dotenv';

dotenv.config();

import { config1 } from './config';
import { Logger } from './services/logger';
import { CacheService } from './services/cache';
import { DatabaseService } from './services/database/database.service';
import { App } from './app';

const dbConfig = {
  user: config1.db.user || process.env.DB_USER || 'postgres',
  host: config1.db.host || process.env.DB_HOST || 'localhost',
  database: config1.db.name || process.env.DB_NAME || 'thinkleap', // Use name from config1 or env
  password: config1.db.password || process.env.DB_PASSWORD || 'postgres',
  port: config1.db.port || parseInt(process.env.DB_PORT || '5432', 10),
  // Only use environment variable for SSL since config1.db.ssl does not exist
  ssl: process.env.DB_SSL === 'true'
};



async function startServer() {
  const logger = new Logger();

  try {
    // Initialize services
    const cacheService = new CacheService(config1.redis.url);
    const databaseService = new DatabaseService(dbConfig);

    // Wait for database connection
    await databaseService.connect();

    // Create and configure application
    const app = new App({
      logger,
      cacheService,
      databaseService,
      env: config1,
      NODE_ENV: process.env.NODE_ENV || 'development',
      CORS_ORIGIN: config1.cors.origin
  });

    // Start server
    const port = config1.port || 3001;
    app.app.listen(port, () => {
      logger.info(`Server started on port ${port}`);
    });

    // Handle shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      await databaseService.disconnect();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
}

startServer();