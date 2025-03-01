import { Router, Request, Response, NextFunction } from 'express';
import { RegisterUserDTO, AuthResponse } from '../types/auth.types';
import { AuthController } from '../controllers/auth.controller';
import { Logger } from '../services/logger';
import { AuthService } from '../services/auth/auth.service';
import { TokenService } from '../services/auth/token.service';
import { EmailService } from '../services/email/email.service';
import { ValidationService } from '../services/validation/validation.service';
import { PasswordResetService } from '../services/auth/password-reset.service';
import { DatabaseService } from "../services/database/database.service";
import { authLimiter, validateAuthInput, authenticateToken } from '../middleware/auth.middleware';
import { config } from '../config';
import { authRateLimiter } from '@/middleware/extended-rate-limit.middleware';

const router = Router();

// Create a properly formatted database config
const dbConfig = {
  user: config.db.user,
  host: config.db.host,
  database: config.db.name,
  password: config.db.password,
  port: config.db.port
};

// Initialize database service once to share among other services
const logger = new Logger();
const databaseService = DatabaseService.getInstance(dbConfig, logger);

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
router.use(authRateLimiter);

// Routes
router.post('/signup', validateAuthInput, async (req: Request<{}, {}, RegisterUserDTO>, res: Response<AuthResponse>, next: NextFunction) => {
  await authController.signup(req, res, next);
});

router.post('/login', validateAuthInput, (req, res, next) => authController.login(req, res, next));

router.get('/verify-email/:token', validateAuthInput, (req, res, next) => authController.verifyEmail(req, res, next));

router.post('/refresh-token', validateAuthInput, (req, res, next) => authController.refreshToken(req, res, next));

router.post('/logout', validateAuthInput, (req, res, next) => authController.logout(req, res, next));

// Password reset routes with fixed typing for arrow functions
router.post('/forgot-password', (req: Request, res: Response, next: NextFunction) => {
  authController.requestPasswordReset(req, res, next);
});

router.post('/reset-password', (req: Request, res: Response, next: NextFunction) => {
  authController.resetPassword(req, res, next);
});

export default router;