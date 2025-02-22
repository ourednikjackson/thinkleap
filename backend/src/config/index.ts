// backend/src/config/index.ts
export const config1 = {
  port: parseInt(process.env.PORT || '3000', 10),
    db: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      name: process.env.DB_NAME || 'thinkleap',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      test: {
        host: process.env.TEST_DB_HOST || 'localhost',
        port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
        name: process.env.TEST_DB_NAME || 'thinkleap_test',
        user: process.env.TEST_DB_USER || 'postgres',
        password: process.env.TEST_DB_PASSWORD || 'postgres',
      }
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      refreshSecret: process.env.JWT_REFRESH_SECRET || 'your_jwt_refresh_secret',
      accessTokenExpiry: '15m',
      refreshTokenExpiry: '7d',
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD
    },
    cors: {
      origin: process.env.CORS_ORIGIN || '*'
    },
    api: {
      pubmed: {
        key: process.env.PUBMED_API_KEY
      }
    }
    // ... other config options
  };

  export default config1;