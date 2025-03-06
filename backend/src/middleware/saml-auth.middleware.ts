import { Request, Response, NextFunction } from 'express';
import { SamlUser, AuthenticatedUser } from '../types/auth.types';

/**
 * Express middleware to authenticate users via SAML session
 */
export function authenticateSamlSession(req: Request, res: Response, next: NextFunction) {
  // Check if user has a session and is authenticated via SAML
  if (req.isAuthenticated() && req.user && req.session?.samlSession) {
    const samlUser = req.user as SamlUser;
    
    // Check if user has a userId (linked to local user)
    if (!samlUser.userId) {
      return res.status(401).json({
        error: 'SAML authentication error: No linked user account'
      });
    }
    
    // Add user info to request for downstream handlers
    (req as any).user = {
      userId: samlUser.userId,
      institutionId: samlUser.institutionId,
      authType: 'saml'
    } as AuthenticatedUser;
    
    next();
  } else {
    res.status(401).json({
      error: 'SAML session not found or expired'
    });
  }
}

/**
 * Express middleware to authenticate users via either JWT token or SAML session
 * This allows for both authentication methods to be used interchangeably
 */
export function authenticateAny(req: Request, res: Response, next: NextFunction) {
  // Check if user is already authenticated via SAML
  if (req.isAuthenticated() && req.user && req.session?.samlSession) {
    const samlUser = req.user as SamlUser;
    
    // Check if user has a userId (linked to local user)
    if (!samlUser.userId) {
      return res.status(401).json({
        error: 'SAML authentication error: No linked user account'
      });
    }
    
    // Add user info to request for downstream handlers
    (req as any).user = {
      userId: samlUser.userId,
      institutionId: samlUser.institutionId,
      authType: 'saml'
    } as AuthenticatedUser;
    
    next();
    return;
  }
  
  // If not authenticated via SAML, try JWT
  // Import here to avoid circular dependencies
  const { authenticateToken } = require('./auth.middleware');
  authenticateToken(req, res, next);
}