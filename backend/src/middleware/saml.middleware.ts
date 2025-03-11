import { Request, Response, NextFunction } from 'express';
import { SamlService } from '../services/auth/saml.service';
import { CacheService } from '../services/cache/cache.service';
import { DatabaseService } from '../services/database/database.service';
import { Logger } from '../services/logger';
import { config } from '../config';
import '../types/user'; // Import for type augmentation

// Initialize services for middleware use
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
});

const samlService = new SamlService(
  databaseService,
  cacheService,
  logger,
  config.saml.baseUrl || 'https://thinkleap.local'
);

/**
 * Middleware to authenticate SAML sessions from cookies
 */
export const authenticateSamlSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get session ID from cookie
    const sessionId = req.cookies.sid;
    
    if (!sessionId) {
      return res.status(401).json({ error: 'Unauthorized: No session found' });
    }
    
    // Get user from session
    const user = await samlService.getUserFromSession(sessionId);
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
    }
    
    // Attach user to request
    req.user = user;
    
    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    logger.error('Error authenticating SAML session', error as Error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Middleware to optionally authenticate SAML sessions
 * If the user is not authenticated, the request will continue
 * but req.user will be null
 */
export const optionalSamlAuthentication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get session ID from cookie
    const sessionId = req.cookies.sid;
    
    if (sessionId) {
      // Get user from session
      const user = await samlService.getUserFromSession(sessionId);
      
      if (user) {
        // Attach user to request
        req.user = user;
      }
    }
    
    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    logger.error('Error in optional authentication', error as Error);
    // Continue without user
    next();
  }
};

/**
 * Middleware to check if the authenticated user belongs to a specific client
 */
export const requireClientMembership = (clientId: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if user is authenticated and belongs to the specified client
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }
    
    // Check if clientId property exists on user and matches the required clientId
    // Cast to Express.User for type safety
    const authUser = req.user as Express.User;
    if (authUser.clientId !== clientId) {
      return res.status(403).json({ error: 'Forbidden: You do not have access to this resource' });
    }
    
    // User is authorized, continue
    next();
  };
};

/**
 * Middleware to check if the authenticated user is an admin
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  // Check if user is authenticated and is an admin
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }
  
  // Cast to Express.User for type safety
  const authUser = req.user as Express.User;
  if (!authUser.isAdmin) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  
  // User is an admin, continue
  next();
};
