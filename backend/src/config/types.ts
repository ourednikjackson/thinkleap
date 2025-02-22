// backend/src/config/types.ts
export interface DatabaseConfig {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    test?: {
      host: string;
      port: number;
      name: string;
      user: string;
      password: string;
    };
  }
  
  export interface RedisConfig {
    url: string;
    port?: number;
    password?: string;
  }
  
  export interface Config {
    env: string;
    port: number;
    db: DatabaseConfig;
    redis: RedisConfig;
    cors: {
      origin: string;
    };
    api: {
      pubmed?: {
        key?: string;
      };
    };
  }