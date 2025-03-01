// backend/src/routes/search.routes.ts
import { Router } from 'express';
import { SearchController } from '../controllers/search.controller';
import { SearchService } from '../services/search/search.service';
import { SearchCacheService } from '../services/search/search.cache.service';
import { DatabaseService } from '../services/database/database.service';
import { CacheService } from '../services/cache';
import { Logger } from '../services/logger';
import { authenticateToken } from '../middleware/auth.middleware';
import { rateLimit } from '../middleware/rate-limit.middleware';
import { searchRateLimiter } from '@/middleware/extended-rate-limit.middleware';
import { config1 } from '../config';

const router = Router();

const dbConfig = {
  user: config1.db.user || process.env.DB_USER || 'postgres',
  host: config1.db.host || process.env.DB_HOST || 'localhost',
  database: config1.db.name || process.env.DB_NAME || 'thinkleap', // Use name from config1 or env
  password: config1.db.password || process.env.DB_PASSWORD || 'postgres',
  port: config1.db.port || parseInt(process.env.DB_PORT || '5432', 10),
  // Only use environment variable for SSL since config1.db.ssl does not exist
  ssl: process.env.DB_SSL === 'true'
};


// Initialize services
const logger = new Logger();
const databaseService = DatabaseService.getInstance(dbConfig, logger);
const cacheService = new CacheService(process.env.REDIS_URL || 'redis://localhost:6379');
const searchCache = new SearchCacheService(cacheService, logger);
const searchService = new SearchService(
  logger,
  cacheService,
  searchCache,
  {
    PUBMED_API_KEY: process.env.PUBMED_API_KEY
  }
);
const searchController = new SearchController(searchService, logger);

// Apply rate limiting to search endpoint
const searchRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30 // 30 requests per minute
});

// Protect search routes
router.use(authenticateToken);

// Routes
router.get('/search', searchRateLimiter, searchController.search);

export default router;