// backend/src/routes/auth.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { RegisterUserDTO, AuthResponse } from '../types/auth.types';
import { AuthController, refreshToken } from '../controllers/auth.controller';
import { AuthService } from '../services/auth/auth.service';
import { TokenService } from '../services/auth/token.service';
import { EmailService } from '../services/email/email.service';
import { ValidationService } from '../services/validation/validation.service';
import { PasswordResetService } from '../services/auth/password-reset.service';
import { DatabaseService } from "../services/database/database.service";
import { authLimiter, validateAuthInput, authenticateToken } from '../middleware/auth.middleware';
import { config } from 'dotenv';
import { config1 } from '../config';

const router = Router();

// Initialize database service once to share among other services
const databaseService = new DatabaseService(config1.db);
const validationService = new ValidationService();
const emailService = new EmailService();
const tokenService = new TokenService();

// Create AuthService before PasswordResetService since it's needed as a dependency
const authService = new AuthService(validationService, databaseService);

// Create password reset service with all required dependencies
const passwordResetService = new PasswordResetService(
  databaseService, 
  emailService, 
  authService
);

// Initialize auth controller with all required services
const authController = new AuthController(
  authService,
  tokenService,
  emailService,
  passwordResetService,
  validationService
);

// Apply rate limiting to auth routes
router.use(authLimiter);

// Routes
router.post('/signup', validateAuthInput, async (req: Request<{}, {}, RegisterUserDTO>, res: Response<AuthResponse>) => {
    await authController.signup(req, res);
});

router.post('/login', validateAuthInput, (req, res) => authController.login(req, res));

router.get('/verify-email/:token', (req, res) => authController.verifyEmail(req, res));

router.post('/refresh-token', (req, res) => authController.refreshToken(req, res));

router.post('/logout', (req, res) => authController.logout(req, res));

// Password reset routes with fixed typing for arrow functions
router.post('/forgot-password', (req: Request, res: Response, next: NextFunction) => {
  authController.requestPasswordReset(req, res, next);
});

router.post('/reset-password', (req: Request, res: Response, next: NextFunction) => {
  authController.resetPassword(req, res, next);
});

export default router;