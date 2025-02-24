// backend/src/routes/user.routes.ts
import { Router, Response, NextFunction } from 'express';
import { UserController } from '../controllers/user.controller';
import { UserService } from '../services/user/user.service';
import { InstitutionVerificationService } from '../services/user/institution-verification.service';
import { EmailService } from '../services/email/email.service';
import { DatabaseService } from '../services/database/database.service';
import { authenticateToken } from '../middleware/auth.middleware';
import { AuthenticatedRequest } from '../types/auth.types';
import { config1 } from '../config';

const router = Router();

// Initialize services
const databaseService = new DatabaseService(config1.db);
const emailService = new EmailService();
const userService = new UserService(databaseService);
const institutionVerificationService = new InstitutionVerificationService(databaseService, emailService);

// Initialize controller with both required services
const userController = new UserController(userService, institutionVerificationService);


// Protect all routes
router.use(authenticateToken);

// Routes
router.get('/profile', userController.getProfile.bind(userController));

router.put('/profile', userController.updateProfile.bind(userController));

router.delete('/account', userController.deleteAccount.bind(userController));

router.post('/activity', userController.updateLastActivity.bind(userController));

router.post('/institution/verify-request', userController.requestInstitutionVerification.bind(userController));
router.post('/institution/verify-code', userController.verifyInstitutionCode.bind(userController));
router.get('/institution/status', userController.getInstitutionVerificationStatus.bind(userController));

export default router;