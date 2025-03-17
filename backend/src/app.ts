import express, { Express, Request, Response, NextFunction, Router } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import searchRoutes from './routes/search.routes';
import savedSearchRoutes from './routes/saved-search.routes';
import preferencesRoutes from './routes/preferences.routes';
import metadataRoutes from './routes/metadata.routes';
import oaiPmhRoutes from './routes/oai-pmh';
import { CacheService } from './services/cache';
import { Logger } from './services/logger';
import { DatabaseService } from './services/database/database.service';
import compression from 'compression';
import { Config } from './config/types';

export interface AppConfig {
  logger: Logger;
  databaseService: DatabaseService;
  cacheService: CacheService
  env: Config;
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
    // Enable JSON body parsing
    this.app.use(express.json());
    
    this.app.use(compression());

    // Log CORS configuration
    console.log(`CORS configured to allow origin: ${this.config.CORS_ORIGIN}`);

    // For development, allow multiple origins by checking the request origin
    this.app.use(cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, postman)
        if (!origin) return callback(null, true);
        
        // List of allowed origins - in production, this should be more restrictive
        const allowedOrigins = [
          this.config.CORS_ORIGIN,  // From env variable
          'http://localhost:3000',  // Local development
          'http://frontend:3000',   // Docker container reference
          'http://localhost:3001',  // Additional local port
          'http://backend:4000'     // Backend self-reference
        ];
        
        console.log(`Received request with origin: ${origin}`);
        
        if (allowedOrigins.indexOf(origin) !== -1 || this.config.NODE_ENV === 'development') {
          callback(null, true);
        } else {
          console.log(`Origin ${origin} not allowed by CORS`);
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Access-Control-Allow-Origin'],
      exposedHeaders: ['Access-Control-Allow-Origin'],
      credentials: true  // Allow credentials (cookies, authorization headers)
    }));

    // Configure Helmet with CSP that doesn't block CORS requests
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'", 'https://api.pubmed.gov', 'http://localhost:3000', 'http://frontend:3000', this.config.CORS_ORIGIN],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'none'"],
          frameSrc: ["'none'"],
        },
      },
      // Allow cross-origin requests
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'same-origin' },
      xFrameOptions: { action: 'deny' },
      strictTransportSecurity: {
        maxAge: 63072000, // 2 years
        includeSubDomains: true,
      },
    }));
  }

  private setupRoutes(): void {
    // Log incoming requests
    this.app.use((req, res, next) => {
      console.log(`Backend received: ${req.method} ${req.path}`);
      next();
    });
    
    // Setup OPTIONS handler for CORS preflight requests
    this.app.options("*", (req, res) => {
      console.log('Handling preflight OPTIONS request');
      
      // Set CORS headers
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      res.header('Access-Control-Allow-Credentials', 'true');
      
      // Respond with 200
      res.status(200).end();
    });
    
    // Health check endpoint for system monitoring
    const healthRouter = express.Router();
    healthRouter.get('/', (_req: Request, res: Response) => {
      res.json({ status: 'healthy' });
    });
    this.app.use('/health', healthRouter);


    this.app.use('/api', searchRoutes);
    this.app.use('/api/saved-searches', savedSearchRoutes);
    this.app.use('/api/preferences', preferencesRoutes);
    this.app.use('/api/metadata', metadataRoutes);
    this.app.use('/api/oai-pmh', oaiPmhRoutes);

    // Add a catch-all route handler for 404s after all other routes are defined
    const notFoundRouter = express.Router();
    notFoundRouter.all('*', (req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not Found'
      });
    });
    this.app.use(notFoundRouter);
  }

  private setupErrorHandling(): void {
    // Global error handler middleware
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