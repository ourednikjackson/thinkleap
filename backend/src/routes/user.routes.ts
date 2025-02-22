// backend/src/routes/user.routes.ts
import { Router, Response, NextFunction } from 'express';
import { UserController } from '../controllers/user.controller';
import { UserService } from '../services/user/user.service';
import { DatabaseService } from '../services/database/database.service';
import { authenticateToken } from '../middleware/auth.middleware';
import { AuthenticatedRequest } from '../types/auth.types';
import { config1 } from '../config';

const router = Router();

// Initialize services
const databaseService = new DatabaseService(config1.db);
const userService = new UserService(databaseService);
const userController = new UserController(userService);

// Protect all routes
router.use(authenticateToken);

// Routes
router.get('/profile', userController.getProfile.bind(userController));

router.put('/profile', userController.updateProfile.bind(userController));

router.delete('/account', userController.deleteAccount.bind(userController));

router.post('/activity', userController.updateLastActivity.bind(userController));

export default router;