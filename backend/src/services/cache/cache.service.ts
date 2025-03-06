// backend/src/services/cache/cache.service.ts
import Redis from 'ioredis';
import { CacheService1, CacheOptions } from './types';
import { RedisFactory } from './redis-factory';
import { Logger } from '../logger';

export interface ICache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

export class CacheService implements ICache {
  private readonly redis: Redis;
  private readonly defaultTTL = 3600; // 1 hour default TTL
  private readonly logger = new Logger('CacheService');

  constructor(redisUrl: string, redisHost?: string, redisPort?: number) {
    // Create Redis client using the factory
    this.redis = RedisFactory.createClient(redisUrl, {
      dockerHost: redisHost,
      dockerPort: redisPort,
      onConnect: () => {
        this.logger.info('Cache Redis client connected successfully');
      },
      onError: (err) => {
        this.logger.error('Cache Redis connection error:', err);
      }
    });
  }

  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const value = await this.redis.get(key);
    if (!value) return null;
    
    try {
      const parsed = JSON.parse(value);
      
      // Check if we have the wrapped format with expiration
      if (parsed.data && parsed.expires) {
        // If stale-while-revalidate is enabled and data is expired
        if (options.staleWhileRevalidate && parsed.expires < Date.now()) {
          // Return stale data but trigger background refresh
          setTimeout(() => this.redis.publish('cache:refresh', key), 0);
          return parsed.data as T;
        }
        
        return parsed.data as T;
      }
      
      // Fallback for older cache format
      return parsed as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const serializedValue = JSON.stringify(value);
    const ttl = options.ttl ?? this.defaultTTL;

    if (ttl > 0) {
      await this.redis.setex(key, ttl, serializedValue);
    } else {
      await this.redis.set(key, serializedValue);
    }
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }
  
  getClient(): Redis {
    return this.redis;
  }
  
  getRedisFactory(): typeof RedisFactory {
    return RedisFactory;
  }
}