// backend/src/services/cache/memory-cache.service.ts
import { CacheOptions } from './types';
import { ICache } from './cache.service';

interface CacheItem<T> {
  value: T;
  expires: number | null;
}

/**
 * In-memory implementation of the cache service
 * Used as a fallback when Redis is not available
 */
export class MemoryCacheService implements ICache {
  private cache: Map<string, CacheItem<any>> = new Map();
  private readonly defaultTTL = 3600; // 1 hour default TTL
  
  constructor() {
    console.log('Using in-memory cache service (Redis fallback)');
    
    // Periodically clean up expired items
    setInterval(() => this.cleanup(), 60 * 1000); // Clean every minute
  }
  
  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (item.expires && item.expires < now) {
        this.cache.delete(key);
      }
    }
  }

  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const item = this.cache.get(key);
    if (!item) return null;
    
    // Check if expired
    if (item.expires && item.expires < Date.now()) {
      // If stale-while-revalidate is enabled, return stale data
      if (options.staleWhileRevalidate) {
        return item.value;
      }
      
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttl ?? this.defaultTTL;
    
    this.cache.set(key, {
      value,
      expires: ttl > 0 ? Date.now() + (ttl * 1000) : null
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.cache.has(key);
  }
  
  getClient(): any {
    return null; // No client for in-memory cache
  }
  
  getRedisFactory(): any {
    return null; // No Redis factory for in-memory cache
  }
}