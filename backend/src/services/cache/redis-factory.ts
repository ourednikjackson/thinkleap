// backend/src/services/cache/redis-factory.ts
import Redis from 'ioredis';
import { Logger } from '../logger';

/**
 * A factory for creating Redis connections with Docker environment support
 */
export class RedisFactory {
  private static logger = new Logger('RedisFactory');

  /**
   * Creates a Redis connection that works in both Docker and non-Docker environments
   * 
   * @param url Redis URL (may not be used in Docker environment)
   * @param options Additional Redis connection options and environment detection
   * @returns Redis connection
   */
  static createClient(
    url?: string,
    options: {
      dockerHost?: string;
      dockerPort?: number;
      prefix?: string;
      isDocker?: boolean;
      onError?: (err: Error) => void;
      onConnect?: () => void;
    } = {}
  ): Redis {
    const {
      dockerHost = 'redis',
      dockerPort = 6379,
      prefix = '',
      isDocker = process.env.DOCKER_ENV === 'true' || url?.includes('redis:'),
      onError,
      onConnect,
    } = options;

    let client: Redis;

    // Docker environment detection
    if (isDocker) {
      this.logger.info(`Creating Redis client with Docker settings: ${dockerHost}:${dockerPort}`);
      
      client = new Redis({
        host: dockerHost,
        port: dockerPort,
        keyPrefix: prefix,
      });
    } else {
      this.logger.info(`Creating Redis client with URL: ${url}`);
      
      client = new Redis(url || 'redis://localhost:6379', {
        keyPrefix: prefix,
      });
    }

    // Add event handlers
    client.on('connect', () => {
      this.logger.info('Redis client connected successfully');
      if (onConnect) onConnect();
    });

    client.on('error', (err) => {
      this.logger.error('Redis connection error:', err);
      if (onError) onError(err);
    });

    return client;
  }
}