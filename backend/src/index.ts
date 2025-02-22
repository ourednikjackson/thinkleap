// backend/src/index.ts
import { config1 } from './config';
import { Logger } from './services/logger';
import { CacheService } from './services/cache';
import { DatabaseService } from './services/database/database.service';
import { App } from './app';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const logger = new Logger();

  try {
    // Initialize services
    const cacheService = new CacheService(config1.redis.url);
    const databaseService = new DatabaseService(config1.db);

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
    const port = config1.port || 3000;
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