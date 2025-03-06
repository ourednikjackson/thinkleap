import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import passport from 'passport';
import connectRedis from 'connect-redis';
import Redis from 'ioredis';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import searchRoutes from './routes/search.routes';
import savedSearchRoutes from './routes/saved-search.routes';
import preferencesRoutes from './routes/preferences.routes';
import extensionRoutes from './routes/extension.routes';
// import samlAuthRoutes from './routes/saml-auth.routes'; // Temporarily disabled
import metadataRoutes from './routes/metadata.routes';
import { CacheService, MemoryCacheService } from './services/cache';
import { Logger } from './services/logger';
import { DatabaseService } from './services/database/database.service';
import compression from 'compression';
import { Config } from './config/types';

// Extend Express Session with our custom properties
declare module 'express-session' {
  interface SessionData {
    institutionId?: string;
    samlSession?: boolean;
    samlNameId?: string;
    samlSessionIndex?: string;
  }
}

export interface AppConfig {
  logger: Logger;
  databaseService: DatabaseService;
  cacheService: CacheService | MemoryCacheService;
  env: Config;
  NODE_ENV: string;
  CORS_ORIGIN: string;
  SESSION_SECRET: string;
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
    this.app.use(express.urlencoded({ extended: true })); // For parsing SAML responses
    
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

    // Setup session store - use Redis if available, otherwise use memory store
    let sessionStore;
    
    try {
      // Check if we can use the Redis factory
      const redisFactory = this.config.cacheService.getRedisFactory();
      
      if (redisFactory) {
        // Create a dedicated Redis client for sessions using the factory
        const sessionRedis = redisFactory.createClient(
          this.config.env.redis.url,
          {
            dockerHost: 'redis', // Always use 'redis' in Docker
            dockerPort: 6379,
            prefix: 'thinkleap:sess:',
            isDocker: true, // Force Docker mode
            onConnect: () => {
              this.logger.info('Redis session client connected successfully');
            },
            onError: (err) => {
              this.logger.error('Redis session client error:', err);
            }
          }
        );
        
        // Create the session store
        const RedisStoreConstructor = connectRedis(session);
        sessionStore = new RedisStoreConstructor({ 
          client: sessionRedis,
          prefix: 'thinkleap:sess:'
        });
        
        this.logger.info('Using Redis session store');
      } else {
        this.logger.info('Redis factory not available, using memory session store');
      }
    } catch (error) {
      this.logger.warn('Failed to create Redis session store, falling back to memory store', error);
      // Fall back to memory store (no assignment needed)
    }
    
    const sessionConfig = {
      store: sessionStore, // Will be undefined if Redis is not available (falls back to memory store)
      secret: this.config.SESSION_SECRET || 'thinkleap-secret-change-in-production',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: this.config.NODE_ENV === 'production', // HTTPS in production
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      }
    };

    // Apply session middleware
    this.app.use(session(sessionConfig));

    // Initialize Passport
    this.app.use(passport.initialize());
    this.app.use(passport.session());

    // Configure Helmet with CSP that doesn't block CORS requests
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'", 'https://api.pubmed.gov', 'https://api.crossref.org', 'http://localhost:3000', 'http://frontend:3000', this.config.CORS_ORIGIN],
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
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy' });
    });

    // JWT-based authentication routes
    this.app.use('/api/auth', authRoutes);
    
    // SAML-based authentication routes - temporarily disabled
    // this.app.use('/api/auth/saml', samlAuthRoutes);
    
    // User management routes
    this.app.use('/api/users', userRoutes);
    
    // Legacy search routes
    this.app.use('/api', searchRoutes);
    
    // Saved searches routes
    this.app.use('/api/saved-searches', savedSearchRoutes);
    
    // User preferences routes
    this.app.use('/api/preferences', preferencesRoutes);
    
    // Browser extension routes
    this.app.use('/api/extension', extensionRoutes);
    
    // New metadata search and harvesting routes
    this.app.use('/api/metadata', metadataRoutes);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found'
      });
    });
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      // Log the error
      this.logger.error('Unhandled error', err);
      
      // Handle Redis connection errors specifically - we'll still send a response
      // but log details about the Redis issue
      if (err.name === 'RedisError' || (err.message && err.message.includes('Redis'))) {
        this.logger.warn('Redis error occurred - check Redis connection', {
          redisUrl: this.config.env.redis.url,
          error: err.message
        });
      }
      
      // Determine if this is a known error type
      const statusCode = err.statusCode || 500;
      const errorMessage = err.message || 'Internal Server Error';
      
      // Send error response
      res.status(statusCode).json({
        error: {
          message: this.config.NODE_ENV === 'production' && statusCode === 500 
            ? 'Internal Server Error' // Hide implementation details in production
            : errorMessage,
          status: statusCode,
          // Only include stack trace in development
          ...(this.config.NODE_ENV !== 'production' && { stack: err.stack })
        }
      });
    });
  }
}