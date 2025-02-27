// backend/src/app.ts
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import searchRoutes from './routes/search.routes';
import savedSearchRoutes from './routes/saved-search.routes';
import preferencesRoutes from './routes/preferences.routes'
import { CacheService } from './services/cache';
import { Logger } from './services/logger';
import { DatabaseService } from './services/database/database.service';
import compression from 'compression';

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
    this.app.use(compression());

    this.app.use(cors({
      origin: this.config.CORS_ORIGIN, // Should include http://localhost:3000
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));
    // Enhanced security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'", 'https://api.pubmed.gov'],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'none'"],
          frameSrc: ["'none'"],
        },
      },
      referrerPolicy: { policy: 'same-origin' },
      xFrameOptions: { action: 'deny' },
      strictTransportSecurity: {
        maxAge: 63072000, // 2 years
        includeSubDomains: true,
      },
    }));
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

    this.app.use('/api/saved-searches', savedSearchRoutes);
    this.app.use('/api/preferences', preferencesRoutes);

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
