// backend/src/routes/preferences.routes.ts
import { Router } from 'express';
import { PreferencesController } from '../controllers/preferences.controller';
import { UserPreferencesService } from '../services/user/preferences.service';
import { DatabaseService } from '../services/database/database.service';
import { Logger } from '../services/logger';
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
const preferencesService = new UserPreferencesService(databaseService, logger);

// Initialize controller
const preferencesController = new PreferencesController(
  preferencesService,
  logger
);

// Protect all routes
router.use(authenticateToken);

// Routes
router.get('/', preferencesController.getPreferences);
router.patch('/', preferencesController.updatePreferences);
router.post('/reset', preferencesController.resetPreferences);

export default router;