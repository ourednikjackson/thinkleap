// backend/src/app.ts
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import searchRoutes from './routes/search.routes';
import { CacheService } from './services/cache';
import { Logger } from './services/logger';
import { DatabaseService } from './services/database/database.service';

export interface AppConfig {
  logger: Logger;
  databaseService: DatabaseService;
  cacheService: CacheService
  env: {
    db: {
      host: string;
      port: number;
      name: string;
      user: string;
      password: string;
      test: {
        host: string;
        port: number;
        name: string;
        user: string;
        password: string;
      };
    };
    jwt: {
      secret: string;
      refreshSecret: string;
      accessTokenExpiry: string;
      refreshTokenExpiry: string;
    };
    redis: {
      url: string;
    };
    cors: {
      origin: string;
    };
    api: {
      // ... other API configurations
    };
}
    NODE_ENV: string;
    CORS_ORIGIN: string;
  }


export class App {
  public app: Express;
  private readonly logger: Logger;

  constructor(private readonly config: AppConfig) {
    this.app = express();
    this.logger = config.logger;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS configuration
    this.app.use(cors({
      origin: this.config.CORS_ORIGIN,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Body parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req: Request, _res: Response, next: NextFunction) => {
      this.logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent')
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({ status: 'healthy' });
    });

    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/users', userRoutes);
    this.app.use('/api', searchRoutes);

    // 404 handler
    this.app.use((_req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not Found'
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      this.logger.error('Unhandled error', err);

      res.status(500).json({
        error: this.config.NODE_ENV === 'development' 
          ? err.message 
          : 'Internal Server Error'
      });
    });
  }
}
