// backend/src/routes/auth.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { RegisterUserDTO, AuthResponse } from '../types/auth.types';
import { AuthController, refreshToken } from '../controllers/auth.controller';
import { AuthService } from '../services/auth/auth.service';
import { TokenService } from '../services/auth/token.service';
import { EmailService } from '../services/email/email.service';
import { ValidationService } from '../services/validation/validation.service';
import { DatabaseService } from "../services/database/database.service";
import { authLimiter, validateAuthInput, authenticateToken } from '../middleware/auth.middleware';
import { config } from 'dotenv';
import { config1 } from '../config';


const router = Router();
const authController = new AuthController(
  new AuthService(
    new ValidationService(),
    new DatabaseService(config1.db)
  ),
  new TokenService(),
  new EmailService()
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

export default router;