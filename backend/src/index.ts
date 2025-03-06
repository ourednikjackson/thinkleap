// backend/src/index.ts
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

import { config } from './config';
import { Logger } from './services/logger';
import { CacheService, MemoryCacheService } from './services/cache';
import { DatabaseService } from './services/database/database.service';
import { App } from './app';

// DatabaseConfig is now directly formatted for the DatabaseService
const dbConfig = {
  user: config.db.user,
  host: config.db.host,
  database: config.db.name,
  password: config.db.password,
  port: config.db.port,
};

async function startServer() {
  const logger = new Logger();

  try {
    // Initialize services
    let cacheService;
    
    // Check if we're in Docker environment
    const isDockerEnv = process.env.DOCKER_ENV === 'true' || 
                        process.env.REDIS_URL?.includes('redis:6379');
                        
    if (isDockerEnv) {
      logger.info('Detected Docker environment - using Redis with Docker network settings');
    }
    
    try {
      // Try to use Redis - the CacheService constructor handles Docker environment
      cacheService = new CacheService(
        config.redis.url,
        config.redis.host,
        config.redis.port
      );
      
      logger.info(`Initializing Redis cache service with URL: ${config.redis.url}`);
      if (isDockerEnv) {
        logger.info(`Redis Docker host: ${config.redis.host}, port: ${config.redis.port}`);
      }
    } catch (error) {
      // Fall back to memory cache
      logger.warn('Redis initialization failed, using in-memory cache as fallback', error);
      cacheService = new MemoryCacheService();
    }
    
    const databaseService = DatabaseService.getInstance(dbConfig, logger);

    // Wait for database connection
    await databaseService.connect();

    // Create and configure application
    const app = new App({
      logger,
      cacheService,
      databaseService,
      env: config,
      NODE_ENV: config.env,
      CORS_ORIGIN: config.cors.origin,
      SESSION_SECRET: process.env.SESSION_SECRET || 'thinkleap-dev-session-secret'
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