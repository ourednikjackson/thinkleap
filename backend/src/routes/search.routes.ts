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
import { config1 } from '../config';

const router = Router();

// Initialize services
const logger = new Logger();
const databaseService = new DatabaseService(config1.db);
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
router.get('/search', searchRateLimit, searchController.search);

export default router;