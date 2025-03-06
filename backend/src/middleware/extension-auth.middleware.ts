import { Request, Response, NextFunction } from 'express';
import { Logger } from '../services/logger';

const logger = new Logger('ExtensionAuth');

/**
 * Middleware to authenticate requests using API key
 */
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const apiKey = req.headers['x-api-key'];
    
    // Get the API key from environment variables
    const validApiKey = process.env.EXTENSION_API_KEY;
    
    if (!validApiKey) {
      logger.warn('API key not configured in environment variables');
      res.status(500).json({
        status: 'error',
        message: 'API authentication not properly configured'
      });
      return;
    }
    
    if (!apiKey) {
      logger.warn('Request missing API key header');
      res.status(401).json({
        status: 'error',
        message: 'API key is required'
      });
      return;
    }
    
    if (apiKey !== validApiKey) {
      logger.warn('Invalid API key provided');
      res.status(403).json({
        status: 'error',
        message: 'Invalid API key'
      });
      return;
    }
    
    // API key is valid, proceed to next middleware
    next();
  } catch (error) {
    logger.error('Error in API key authentication', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during authentication'
    });
  }
};