// backend/src/services/cache/cache.service.ts
import Redis from 'ioredis';
import { CacheService1, CacheOptions } from './types';
import { Logger } from '../logger';



export interface ICache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

export interface RedisConfig {
  host?: string;
  url?: string;
  port?: number;
  password?: string;
}

export class CacheService implements ICache {
  private readonly redis: Redis;
  private readonly defaultTTL = 3600; // 1 hour default TTL
  private readonly logger?: Logger;

  constructor(config: RedisConfig | string, logger?: Logger) {
    this.logger = logger;
    
    try {
      if (typeof config === 'string') {
        this.redis = new Redis(config);
      } else {
        // Use the URL if provided, otherwise use host/port/password
        if (config.url) {
          this.redis = new Redis(config.url);
        } else {
          this.redis = new Redis({
            host: config.host || 'localhost',
            port: config.port || 6379,
            password: config.password
          });
        }
      }
      
      this.logger?.info('Redis cache service initialized successfully');
    } catch (error) {
      this.logger?.error('Failed to initialize Redis cache service', error as Error);
      throw error;
    }
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
}