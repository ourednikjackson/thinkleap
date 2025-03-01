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
import { config } from '../config';

const router = Router();

const dbConfig = {
  user: config.db.user,
  host: config.db.host,
  database: config.db.name,
  password: config.db.password,
  port: config.db.port
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