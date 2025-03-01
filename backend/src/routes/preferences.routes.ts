// backend/src/routes/preferences.routes.ts
import { Router } from 'express';
import { PreferencesController } from '../controllers/preferences.controller';
import { UserPreferencesService } from '../services/user/preferences.service';
import { DatabaseService } from '../services/database/database.service';
import { Logger } from '../services/logger';
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