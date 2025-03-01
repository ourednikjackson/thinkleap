// backend/src/types/config.types.ts

export interface DatabaseConfig {
    user: string;
    host: string;
    database: string;
    password: string;
    port: number;
    ssl: boolean;
  }
  
  export interface Config {
    port: number;
    nodeEnv: string;
    db: DatabaseConfig;
    test: {
      db: DatabaseConfig;
    };
    jwt: {
      secret: string;
      refreshSecret: string;
      accessTokenExpiry: string;
      refreshTokenExpiry: string;
    };
    redis: {
      url: string;
      port: number;
      password: string | undefined;
    };
    cors: {
      origin: string;
    };
    api: {
      pubmed: {
        key: string | undefined;
      };
    };
  }