import { Router, Request, Response, NextFunction } from 'express';
import { SamlController } from '../controllers/saml.controller';
import { SamlService } from '../services/auth/saml.service';
import { DatabaseService } from '../services/database/database.service';
import { CacheService } from '../services/cache/cache.service';
import { Logger } from '../services/logger';
import { config } from '../config';
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

const cacheService = new CacheService({
  host: config.redis.host || config.redis.url,
  port: config.redis.port,
  password: config.redis.password
}, logger);

// Initialize SAML service
const samlService = new SamlService(
  databaseService,
  cacheService,
  logger,
  config.saml.baseUrl || 'https://thinkleap.local'
);

// Initialize SAML controller
const samlController = new SamlController(
  samlService,
  logger,
  config.saml.cookieDomain || ''
);

// Initialize SAML strategies
samlService.initializeStrategies().catch(err => {
  logger.error('Failed to initialize SAML strategies', err);
});

// SAML authentication routes
// Login route
router.get('/login/:clientId', function(req, res, next) {
  samlController.login(req, res, next);
});

// Callback route
router.post('/callback/:clientId', function(req, res, next) {
  samlController.callback(req, res, next);
});

// Metadata route
router.get('/metadata/:clientId', function(req, res, next) {
  samlController.metadata(req, res, next);
});

// Authentication check route
router.get('/check', function(req, res, next) {
  samlController.check(req, res, next);
});

// Logout route
router.get('/logout', function(req, res, next) {
  samlController.logout(req, res, next);
});

export default router;
