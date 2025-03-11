import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as SamlStrategy } from 'passport-saml';
import { SamlService, SamlUserProfile } from '../services/auth/saml.service';
import { Logger } from '../services/logger';
import { CustomError } from '../errors/customError';
import { CookieOptions } from 'express';

export class SamlController {
  constructor(
    private readonly samlService: SamlService,
    private readonly logger: Logger,
    private readonly cookieDomain: string = ''
  ) {
    this.initializePassport();
  }

  private initializePassport(): void {
    // Register the SAML strategies
    passport.serializeUser((user, done) => {
      done(null, user);
    });

    passport.deserializeUser((user, done) => {
      done(null, user as Express.User);
    });
  }

  /**
   * Handle requests for initiating SAML login
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { clientId } = req.params;
      
      if (!clientId) {
        throw new CustomError('VALIDATION_ERROR', 'Client ID is required');
      }
      
      // Get the SAML strategy for this client
      const strategy = this.samlService.getStrategy(clientId);
      
      if (!strategy) {
        throw new CustomError('NOT_FOUND', 'No SAML configuration found for this client');
      }
      
      // Store original URL for redirection after authentication
      const returnTo = req.query.returnTo as string || '/';
      req.session.returnTo = returnTo;
      
      // Authenticate with the SAML strategy
      passport.authenticate(strategy as unknown as passport.Strategy, {
        failureRedirect: '/login?error=saml',
        failureFlash: true
      })(req, res, next);
    } catch (error) {
      this.logger.error('Error initiating SAML login', error as Error);
      next(error);
    }
  }

  /**
   * Handle SAML callback after successful authentication
   */
  async callback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { clientId } = req.params;
      
      if (!clientId) {
        throw new CustomError('VALIDATION_ERROR', 'Client ID is required');
      }
      
      // Get the SAML strategy for this client
      const strategy = this.samlService.getStrategy(clientId);
      
      if (!strategy) {
        throw new CustomError('NOT_FOUND', 'No SAML configuration found for this client');
      }
      
      // Authenticate with the SAML strategy
      passport.authenticate(strategy as unknown as passport.Strategy, {
        failureRedirect: '/login?error=saml_callback',
        failureFlash: true
      }, async (err: Error, profile: SamlUserProfile) => {
        if (err) {
          this.logger.error('SAML authentication error', err);
          return next(err);
        }
        
        if (!profile) {
          return res.redirect('/login?error=no_profile');
        }
        
        try {
          // Process SAML callback and create session
          const { user, sessionId } = await this.samlService.processCallback(clientId, profile);
          
          // Set session cookie
          const cookieOptions: CookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            path: '/'
          };
          
          // Set domain for cross-subdomain authentication if provided
          if (this.cookieDomain) {
            cookieOptions.domain = this.cookieDomain;
          }
          
          res.cookie('sid', sessionId, cookieOptions);
          
          // Redirect back to original URL or default to homepage
          const returnTo = req.session.returnTo || '/';
          delete req.session.returnTo;
          
          res.redirect(returnTo);
        } catch (error) {
          this.logger.error('Error processing SAML callback', error as Error);
          next(error);
        }
      })(req, res, next);
    } catch (error) {
      this.logger.error('Error handling SAML callback', error as Error);
      next(error);
    }
  }

  /**
   * Check if the user is authenticated via SAML
   */
  async check(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      const sessionId = req.cookies.sid;
      
      if (!sessionId) {
        return res.status(401).json({ authenticated: false });
      }
      
      const user = await this.samlService.getUserFromSession(sessionId);
      
      if (!user) {
        return res.status(401).json({ authenticated: false });
      }
      
      // User is authenticated, return user info
      res.json({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      });
    } catch (error) {
      this.logger.error('Error checking authentication', error as Error);
      next(error);
    }
  }

  /**
   * Log the user out
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      const sessionId = req.cookies.sid;
      
      if (sessionId) {
        await this.samlService.logout(sessionId);
      }
      
      // Clear session cookie
      res.clearCookie('sid');
      
      // Redirect to login page
      return res.redirect('/login');
    } catch (error) {
      this.logger.error('Error logging out', error as Error);
      next(error);
    }
  }

  /**
   * Handle SAML metadata requests for service provider
   */
  async metadata(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { clientId } = req.params;
      
      if (!clientId) {
        throw new CustomError('VALIDATION_ERROR', 'Client ID is required');
      }
      
      // Get the SAML strategy for this client
      const strategy = this.samlService.getStrategy(clientId) as unknown as SamlStrategy;
      
      if (!strategy) {
        throw new CustomError('NOT_FOUND', 'No SAML configuration found for this client');
      }
      
      // Generate metadata with proper certificate parameters
      // For this implementation we're not using encryption, so pass null for both parameters
      // This is safer than trying to access the certificate directly, as the Strategy already has this info
      const metadata = strategy.generateServiceProviderMetadata(null, null);
      
      // Set content type and send metadata
      res.type('application/xml');
      res.send(metadata);
    } catch (error) {
      this.logger.error('Error generating SAML metadata', error as Error);
      next(error);
    }
  }
}
