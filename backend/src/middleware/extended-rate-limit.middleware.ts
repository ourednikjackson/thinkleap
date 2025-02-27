import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix: string;
  skipSuccessfulRequests?: boolean;
  headers?: boolean;
  redisUrl?: string; // Make redisUrl an optional parameter
}

export const createRateLimiter = (options: RateLimitOptions) => {
  // Get redisUrl from options or environment
  const redisUrl = options.redisUrl || process.env.REDIS_URL;
  
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
        
        if (options.headers !== false) {
          res.setHeader('X-RateLimit-Limit', options.max);
          res.setHeader('X-RateLimit-Remaining', options.max - 1);
          res.setHeader('X-RateLimit-Reset', new Date(ipHits[key].resetTime).toISOString());
        }
        
        next();
      } else if (ipHits[key].count < options.max) {
        // Increment counter
        ipHits[key].count++;
        
        if (options.headers !== false) {
          res.setHeader('X-RateLimit-Limit', options.max);
          res.setHeader('X-RateLimit-Remaining', options.max - ipHits[key].count);
          res.setHeader('X-RateLimit-Reset', new Date(ipHits[key].resetTime).toISOString());
        }
        
        next();
      } else {
        // Rate limit exceeded
        if (options.headers !== false) {
          res.setHeader('X-RateLimit-Limit', options.max);
          res.setHeader('X-RateLimit-Remaining', 0);
          res.setHeader('X-RateLimit-Reset', new Date(ipHits[key].resetTime).toISOString());
          res.setHeader('Retry-After', Math.ceil((ipHits[key].resetTime - now) / 1000));
        }
        
        res.status(429).json({
          error: 'Too many requests',
          message: `Please try again in ${Math.ceil((ipHits[key].resetTime - now) / 1000)} seconds`,
          retryAfter: Math.ceil((ipHits[key].resetTime - now) / 1000)
        });
      }
    };
  }
  
  // Use Redis rate limiter when Redis URL is available
  const redisClient = new Redis(redisUrl);
  
  const rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: options.keyPrefix,
    points: options.max,
    duration: options.windowMs / 1000,
  });
  
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Ensure the key is always a string or number
      const key = req.user?.userId ?? req.ip ?? 'fallback_key';
      
      // Consume point
      const rateLimiterRes = await rateLimiter.consume(key);
      
      // Add headers if enabled
      if (options.headers !== false) {
        res.setHeader('X-RateLimit-Limit', options.max);
        res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints);
        res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString());
      }
      
      next();
    } catch (error: any) {
      if (error.remainingPoints !== undefined) {
        // Rate limit exceeded
        if (options.headers !== false) {
          res.setHeader('X-RateLimit-Limit', options.max);
          res.setHeader('X-RateLimit-Remaining', 0);
          res.setHeader('X-RateLimit-Reset', new Date(Date.now() + error.msBeforeNext).toISOString());
          res.setHeader('Retry-After', Math.ceil(error.msBeforeNext / 1000));
        }
        
        res.status(429).json({
          error: 'Too many requests',
          message: `Please try again in ${Math.ceil(error.msBeforeNext / 1000)} seconds`,
          retryAfter: Math.ceil(error.msBeforeNext / 1000)
        });
      } else {
        // Other error
        next(error);
      }
    }
  };
};

// Common rate limiters
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per 15 minutes for auth endpoints
  keyPrefix: 'auth_rate_limit',
  headers: true
});

export const userRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute for user endpoints
  keyPrefix: 'user_rate_limit',
  headers: true
});

export const searchRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute for search endpoints
  keyPrefix: 'search_rate_limit',
  headers: true
});