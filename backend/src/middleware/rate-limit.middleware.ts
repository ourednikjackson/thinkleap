// backend/src/middleware/rate-limit.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix?: string;
}

export const rateLimit = (options: RateLimitOptions) => {
  const redisUrl = process.env.REDIS_URL;
  const keyPrefix = options.keyPrefix || 'rate_limit';
  
  if (!redisUrl) {
    console.warn('REDIS_URL is not defined. Using memory rate limiter instead.');
    
    // Simple in-memory rate limiting as fallback
    const ipHits: Record<string, { count: number, resetTime: number }> = {};
    
    return (req: Request, res: Response, next: NextFunction) => {
      const key = req.user?.userId ?? req.ip ?? 'fallback_key';
      const now = Date.now();
      
      if (!ipHits[key] || ipHits[key].resetTime < now) {
        // Reset or initialize counters
        ipHits[key] = { count: 1, resetTime: now + options.windowMs };
        next();
      } else if (ipHits[key].count < options.max) {
        // Increment counter
        ipHits[key].count++;
        next();
      } else {
        // Rate limit exceeded
        res.status(429).json({
          error: 'Too many requests',
          message: `Please try again in ${Math.ceil((ipHits[key].resetTime - now) / 1000)} seconds`
        });
      }
    };
  }
  
  // Use Redis rate limiter when Redis URL is available
  const redisClient = new Redis(redisUrl);
  
  const rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: keyPrefix,
    points: options.max,
    duration: options.windowMs / 1000,
  });
  
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Ensure the key is always a string or number
      const key = req.user?.userId ?? req.ip ?? 'fallback_key';
      
      // Consume point
      await rateLimiter.consume(key);
      next();
    } catch (error: any) {
      // Rate limit exceeded
      let retryAfter = 60; // Default retry time in seconds
      
      if (error.msBeforeNext) {
        retryAfter = Math.ceil(error.msBeforeNext / 1000);
      }
      
      res.status(429).json({
        error: 'Too many requests',
        message: `Please try again in ${retryAfter} seconds`
      });
    }
  };
};