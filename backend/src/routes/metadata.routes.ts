import { Router } from 'express';
import { MetadataController } from '../controllers/metadata.controller';
import { MetadataSearchService } from '../services/search/metadata-search.service';
import { OaiPmhService } from '../services/harvesting/oai-pmh.service';
import { LoggerService } from '../services/logger/logger.service';
import { DatabaseService } from '../services/database/database.service';
import { CacheService } from '../services/cache';
import { authenticateToken } from '../middleware/auth.middleware';

// Import dependencies
const router = Router();

// Create services and controller
// Note: Dependency injection would normally be handled by a container
// but for simplicity, we're creating instances directly here
const loggerService = new LoggerService();
const databaseService = new DatabaseService();
const cacheService = new CacheService();
const metadataSearchService = new MetadataSearchService(databaseService, loggerService, cacheService);
const oaiPmhService = new OaiPmhService(databaseService, loggerService, cacheService);
const metadataController = new MetadataController(metadataSearchService, oaiPmhService, loggerService);

// Routes for metadata search and harvesting

// Search metadata
router.get('/search', authenticateToken, (req, res, next) => {
  metadataController.search(req, res, next);
});

// Get metadata record by ID
router.get('/records/:id', authenticateToken, (req, res, next) => {
  metadataController.getRecord(req, res, next);
});

// Log access to metadata record
router.post('/records/:id/access', authenticateToken, (req, res, next) => {
  metadataController.logAccess(req, res, next);
});

// Get available providers
router.get('/providers', authenticateToken, (req, res, next) => {
  metadataController.getProviders(req, res, next);
});

// Admin routes - should have additional authorization

// Trigger harvesting
router.post('/harvest/:sourceId', authenticateToken, (req, res, next) => {
  metadataController.triggerHarvest(req, res, next);
});

// Seed initial metadata
router.post('/seed', authenticateToken, (req, res, next) => {
  metadataController.seedInitialMetadata(req, res, next);
});

export default router;