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
import { authRateLimiter } from '@/middleware/extended-rate-limit.middleware';

const router = Router();

// Create a properly formatted database config
const dbConfig = {
  user: config1.db.user || process.env.DB_USER || 'postgres',
  host: config1.db.host || process.env.DB_HOST || 'localhost',
  database: config1.db.name || process.env.DB_NAME || 'thinkleap', // Use name from config1 or env
  password: config1.db.password || process.env.DB_PASSWORD || 'postgres',
  port: config1.db.port || parseInt(process.env.DB_PORT || '5432', 10),
  // Only use environment variable for SSL since config1.db.ssl does not exist
  ssl: process.env.DB_SSL === 'true'
};

// Initialize database service once to share among other services
const databaseService = new DatabaseService(dbConfig);

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