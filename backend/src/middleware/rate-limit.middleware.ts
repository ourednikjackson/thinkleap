// backend/src/middleware/rate-limit.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';

interface RateLimitOptions {
  windowMs: number;
  max: number;
}

export const rateLimit = (options: RateLimitOptions) => {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error('REDIS_URL is not defined in the environment variables');
  }

  const redisClient = new Redis(redisUrl);

  const rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'search_rate_limit',
    points: options.max,
    duration: options.windowMs / 1000,
  });

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Ensure the key is always a string or number
        const key = req.user?.userId ?? req.ip ?? 'fallback_key';
        await rateLimiter.consume(key);
        next();
    } catch (error) {
        res.status(429).json({
            error: 'Too many requests, please try again later'
        });
    }
};
};