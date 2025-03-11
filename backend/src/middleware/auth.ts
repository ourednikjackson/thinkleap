import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Middleware to ensure the user is authenticated
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

/**
 * Middleware to ensure the user is an admin
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  if (!req.user || (req.user as any).role !== 'admin') {
    logger.warn(`Non-admin user attempted to access admin route: ${req.originalUrl}`);
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  next();
};
