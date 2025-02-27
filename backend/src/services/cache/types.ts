// backend/src/services/cache/types.ts
export interface CacheOptions {
    ttl?: number;  // Time to live in seconds
    staleWhileRevalidate?: boolean;
  }
  
  export interface CacheService1 {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
    delete(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
  }