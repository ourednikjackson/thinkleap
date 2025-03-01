// backend/src/routes/saved-search.routes.ts
import { Router } from 'express';
import { SavedSearchController } from '../controllers/saved-search.controller';
import { SavedSearchService } from '../services/search/saved-search.service';
import { DatabaseService } from '../services/database/database.service';
import { SearchService } from '../services/search/search.service';
import { CacheService } from '../services/cache';
import { SearchCacheService } from '../services/search/search.cache.service';
import { Logger } from '../services/logger';
import { AuditLogService } from '../services/audit/audit-log.service';
import { authenticateToken } from '../middleware/auth.middleware';
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
const searchCacheService = new SearchCacheService(cacheService, logger);

// Initialize search service
const searchService = new SearchService(
  logger,
  cacheService,
  searchCacheService,
  {
    PUBMED_API_KEY: process.env.PUBMED_API_KEY
  }
);

// Initialize AuditLogService
const auditLogService = new AuditLogService(databaseService, logger);

// Initialize SavedSearchService
const savedSearchService = new SavedSearchService(
  databaseService,
  searchService,
  logger,
  auditLogService
);

// Now correctly initialize the controller with just what it needs
const savedSearchController = new SavedSearchController(
  savedSearchService,
  logger
);

// Protect all routes
router.use(authenticateToken);

// Routes
router.post('/', savedSearchController.create);
router.get('/', savedSearchController.findAll);
router.get('/:id', savedSearchController.findOne);
router.put('/:id', savedSearchController.update);
router.delete('/:id', savedSearchController.delete);
router.post('/:id/execute', savedSearchController.execute);

export default router;