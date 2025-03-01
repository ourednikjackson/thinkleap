// backend/src/index.ts
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

import { config } from './config';
import { Logger } from './services/logger';
import { CacheService } from './services/cache';
import { DatabaseService } from './services/database/database.service';
import { App } from './app';

// DatabaseConfig is now directly formatted for the DatabaseService
const dbConfig = {
  user: config.db.user,
  host: config.db.host,
  database: config.db.name,
  password: config.db.password,
  port: config.db.port,
  ssl: config.db.ssl
};

async function startServer() {
  const logger = new Logger();

  try {
    // Initialize services
    const cacheService = new CacheService(config.redis.url);
    const databaseService = new DatabaseService(dbConfig);

    // Wait for database connection
    await databaseService.connect();

    // Create and configure application
    const app = new App({
      logger,
      cacheService,
      databaseService,
      env: config,
      NODE_ENV: config.env,
      CORS_ORIGIN: config.cors.origin
    });

    // Start server
    const port = config.port;
    app.app.listen(port, () => {
      logger.info(`Server started on port ${port} in ${config.env} mode`);
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