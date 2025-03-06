// backend/src/middleware/extension-testing.middleware.ts
import { Request, Response, NextFunction } from 'express';
import ExtensionLogger from '../services/logger/extension-logger';

// Create a single logger instance
const extensionLogger = new ExtensionLogger();

/**
 * Middleware to log all extension API requests and responses for testing
 */
export const extensionTestingLogger = (req: Request, res: Response, next: NextFunction): void => {
  // Log the incoming request
  extensionLogger.logRequest(req);
  
  // Capture the original res.json function
  const originalJson = res.json;
  
  // Override res.json to log the response before sending
  res.json = function(body: any) {
    // Log the response
    extensionLogger.logResponse(res.statusCode, body);
    
    // Call the original json method
    return originalJson.call(this, body);
  };
  
  // Continue to the next middleware
  next();
};

/**
 * Enable detailed logging for the extension API for a specific duration
 * @param duration Duration in seconds (default: 1 hour)
 */
export const enableExtensionLogging = (duration: number = 3600): void => {
  extensionLogger.info(`Extension detailed logging enabled for ${duration} seconds`);

  // After the duration, log that the session ended
  setTimeout(() => {
    extensionLogger.info('Extension detailed logging session ended');
  }, duration * 1000);
};

export default extensionTestingLogger;