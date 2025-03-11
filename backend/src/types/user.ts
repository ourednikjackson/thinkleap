/**
 * User interface representing the standard user object across the application
 */
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isAdmin: boolean;
  clientId?: string;
  role?: string;
  metadata?: Record<string, any>;
  userId: string; // Required for SAML integration
}

/**
 * Session user interface for passport and session handling
 */
export interface SessionUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isAdmin: boolean;
  clientId?: string;
  sessionId: string;
  exp: number;
}

/**
 * Extend the Express interfaces to include our user type
 */
/**
 * Type augmentation for Express session
 */
declare module 'express-session' {
  interface SessionData {
    returnTo?: string;
  }
}

declare global {
  namespace Express {
    // This extends the User interface that Passport uses
    interface User {
      // Required properties
      userId: string; // Primary identifier used in SAML integration
      id: string;     // Used in database references
      email: string;
      isAdmin: boolean;
      
      // Optional properties
      firstName?: string;
      lastName?: string;
      clientId?: string;
    }
    
    // This modifies the Request interface to use our User type
    interface Request {
      user?: User;
    }
  }
}
