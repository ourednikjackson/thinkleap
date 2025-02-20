// backend/src/middleware/auth.middleware.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { TokenService } from '../services/auth/token.service';
import { RegisterUserDTO, AuthResponse, AuthErrorType, AuthenticatedRequest, AuthenticatedUser, createAuthError } from '../types/auth.types';
import rateLimit from 'express-rate-limit';

declare module 'express' {
  interface Request {
    user?: { userId: string }; // Define the structure of the user property
  }
}

const tokenService = new TokenService();

export const authenticateToken: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {  // Explicitly declare void return type
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
      res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: createAuthError(AuthErrorType.VALIDATION, 'Authentication required')
      });
      return;  // Explicit void return
  }

  try {
      const decoded = tokenService.verifyToken(token) as AuthenticatedUser;
      (req as AuthenticatedRequest).user = decoded;
      next();
  } catch (error) {
      res.status(403).json({
          success: false,
          message: 'Invalid token',
          error: createAuthError(AuthErrorType.VALIDATION, 'Invalid token')
      });
      return;  // Explicit void return
  }
};

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many attempts, please try again later'
});

export const validateAuthInput = (
  req: Request<{}, {}, RegisterUserDTO>,
  res: Response<AuthResponse>,
  next: NextFunction
) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: {
        type: AuthErrorType.VALIDATION,
        message: 'Missing required fields',
        details: {}
      }
    });
    return; // Stop further processing
  }

  if (typeof password !== 'string' || password.length < 8) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: {
        type: AuthErrorType.VALIDATION,
        message: 'Password must be at least 8 characters long',
        details: {}
      }
    });
    return; // Stop further processing
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: {
        type: AuthErrorType.VALIDATION,
        message: 'Invalid email format',
        details: {}
      }
    });
    return; // Stop further processing
  }

  next();
};