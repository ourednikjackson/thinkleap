import { Router, Request, Response, NextFunction } from 'express';
import { MetadataController } from '../controllers/metadata.controller';
import { OaiPmhService } from '../services/metadata/oai-pmh.service';
import { DatabaseService } from '../services/database/database.service';
import { Logger } from '../services/logger';
import { config } from '../config';
import { authenticateSamlSession, requireAdmin } from '../middleware/saml.middleware';
import '../types/user'; // Import for type augmentation

const router = Router();

// Initialize services
const logger = new Logger();
const databaseService = DatabaseService.getInstance({
  user: config.db.user,
  host: config.db.host,
  database: config.db.name,
  password: config.db.password,
  port: config.db.port
}, logger);

// Initialize OAI-PMH service
const oaiPmhService = new OaiPmhService(
  databaseService,
  logger
);

// Initialize metadata controller
const metadataController = new MetadataController(
  oaiPmhService,
  databaseService,
  logger
);

// Schedule periodic harvesting (run every 24 hours)
oaiPmhService.scheduleHarvesting(24).catch(err => {
  logger.error('Failed to schedule metadata harvesting', err);
});

// Create middleware to check client permissions
const checkClientPermissions = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }
  
  const authUser = req.user as Express.User;
  
  if (!authUser.isAdmin && authUser.clientId !== req.params.clientId) {
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
  }
  
  next();
};

// Type for the controller return types
type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void | Response>;

// Helper function to convert controller methods to Express handlers
const asyncHandler = (handler: AsyncHandler) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };
};

// Metadata routes
// Authenticated admin routes
router.post('/harvest/:clientId', authenticateSamlSession, requireAdmin, 
  asyncHandler(metadataController.harvestClientMetadata.bind(metadataController))
);

router.get('/logs/:clientId', authenticateSamlSession, checkClientPermissions,
  asyncHandler(metadataController.getHarvestingLogs.bind(metadataController))
);

// Search endpoints (available to authenticated users)
router.get('/search', authenticateSamlSession, 
  asyncHandler(metadataController.searchMetadata.bind(metadataController))
);

router.get('/:id', authenticateSamlSession, 
  asyncHandler(metadataController.getMetadataById.bind(metadataController))
);

export default router;
