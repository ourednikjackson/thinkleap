import { Router } from 'express';
import { SamlAuthController } from '../controllers/saml-auth.controller';
import { SamlService } from '../services/auth/saml.service';
import { LoggerService } from '../services/logger/logger.service';
import { DatabaseService } from '../services/database/database.service';
import { CacheService } from '../services/cache';
import { AuthService } from '../services/auth/auth.service';

// Import dependencies
const router = Router();

// Create services and controller
// Note: Dependency injection would normally be handled by a container
// but for simplicity, we're creating instances directly here
const loggerService = new LoggerService();
const databaseService = new DatabaseService();
const cacheService = new CacheService();
const authService = new AuthService(databaseService, loggerService);
const samlService = new SamlService(databaseService, cacheService, loggerService, authService);
const samlAuthController = new SamlAuthController(samlService, loggerService);

// Routes for SAML authentication

// Initiate SAML login
router.get('/login/:institution', (req, res, next) => {
  samlAuthController.login(req, res, next);
});

// Handle SAML response from IdP
router.post('/callback/:institution', (req, res, next) => {
  samlAuthController.callback(req, res, next);
});

// Initiate SAML logout
router.get('/logout', (req, res, next) => {
  samlAuthController.logout(req, res, next);
});

// Handle SAML logout callback
router.get('/logout/callback/:institution', (req, res, next) => {
  samlAuthController.logoutCallback(req, res, next);
});

// Get SAML metadata for SP
router.get('/metadata/:institution', (req, res, next) => {
  samlAuthController.metadata(req, res, next);
});

// Get list of institutions for SAML login
router.get('/institutions', (req, res, next) => {
  samlAuthController.getInstitutions(req, res, next);
});

export default router;