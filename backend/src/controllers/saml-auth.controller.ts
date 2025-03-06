import { Request, Response, NextFunction } from 'express';
import { SamlService } from '../services/auth/saml.service';
import { SamlUser, SamlConfig, SamlAuthDTO } from '../types/auth.types';
import { CustomError } from '../errors/customError';
import { LoggerService } from '../services/logger/logger.service';
import passport from 'passport';
import { Strategy as SamlStrategy } from 'passport-saml';

export class SamlAuthController {
  private strategies: Map<string, SamlStrategy> = new Map();

  constructor(
    private samlService: SamlService,
    private logger: LoggerService
  ) {
    // Initialize passport
    this.initializePassport();
  }

  /**
   * Initialize Passport SAML strategy
   */
  private initializePassport(): void {
    passport.serializeUser((user: SamlUser, done) => {
      done(null, JSON.stringify(user));
    });

    passport.deserializeUser((serialized: string, done) => {
      try {
        const user = JSON.parse(serialized) as SamlUser;
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    });
  }

  /**
   * Get or create SAML strategy for an institution
   * @param institutionId Institution ID or domain
   */
  private async getStrategy(institutionIdOrDomain: string): Promise<SamlStrategy> {
    if (this.strategies.has(institutionIdOrDomain)) {
      return this.strategies.get(institutionIdOrDomain)!;
    }

    try {
      const samlConfig = await this.samlService.getSamlConfig(institutionIdOrDomain);
      
      const strategy = new SamlStrategy(
        {
          entryPoint: samlConfig.entryPoint,
          issuer: samlConfig.issuer,
          cert: samlConfig.cert,
          identifierFormat: samlConfig.identifierFormat,
          validateInResponseTo: samlConfig.validateInResponseTo,
          disableRequestedAuthnContext: samlConfig.disableRequestedAuthnContext,
          acceptedClockSkewMs: samlConfig.acceptedClockSkewMs,
          // Add callbackUrl at runtime from request
          passReqToCallback: true
        },
        (req: Request, profile: any, done: any) => {
          this.samlService.verifySamlResponse(profile, done, req);
        }
      );

      this.strategies.set(institutionIdOrDomain, strategy);
      return strategy;
    } catch (error) {
      this.logger.error('Error creating SAML strategy', { error, institutionIdOrDomain });
      throw new CustomError('SAML_CONFIG_ERROR', 'Error setting up SAML authentication');
    }
  }

  /**
   * Initiate SAML login - redirect to IdP
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { institution } = req.params;
      
      if (!institution) {
        throw new CustomError('VALIDATION_ERROR', 'Institution identifier is required');
      }

      const strategy = await this.getStrategy(institution);
      
      // Add strategy to passport for this request
      const authenticate = passport.authenticate(`saml-${institution}`, {
        failureRedirect: '/auth/login?error=saml',
        failureFlash: true
      });
      
      // Execute the authentication
      authenticate(req, res, next);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle SAML assertion from IdP
   */
  async callback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { institution } = req.params;
      
      if (!institution) {
        throw new CustomError('VALIDATION_ERROR', 'Institution identifier is required');
      }

      // Ensure we have a SAML response
      if (!req.body?.SAMLResponse) {
        throw new CustomError('VALIDATION_ERROR', 'SAML Response not found');
      }

      // Get the strategy
      await this.getStrategy(institution);
      
      // Use Passport to authenticate
      passport.authenticate(`saml-${institution}`, (err: Error | null, user: SamlUser | false) => {
        if (err || !user) {
          this.logger.error('SAML authentication error', { error: err });
          return res.redirect('/auth/login?error=saml');
        }
        
        // Store user in session
        req.login(user, (loginErr) => {
          if (loginErr) {
            this.logger.error('Error logging in SAML user', { error: loginErr });
            return res.redirect('/auth/login?error=session');
          }
          
          // Redirect to the frontend with session
          const redirectUrl = req.body.RelayState || '/dashboard';
          res.redirect(redirectUrl);
        });
      })(req, res, next);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Initiate SAML logout
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Get user from session
      const user = req.user as SamlUser;
      
      if (!user || !user.institutionId) {
        // Just clear the local session if no SAML session
        req.logout((err) => {
          if (err) {
            return next(err);
          }
          return res.redirect('/auth/login');
        });
        return;
      }
      
      // Get the strategy
      const strategy = await this.getStrategy(user.institutionId);
      
      // Generate SAML logout request
      if (strategy.logout && user.nameID && user.sessionIndex) {
        const logoutUrl = await new Promise<string>((resolve, reject) => {
          strategy.logout({
            nameID: user.nameID,
            sessionIndex: user.sessionIndex,
            samlLogoutRequest: {
              callbackUrl: `${req.protocol}://${req.get('host')}/api/auth/saml/logout/callback/${user.institutionId}`
            }
          }, (err, url) => {
            if (err) {
              reject(err);
            } else {
              resolve(url);
            }
          });
        });
        
        // Logout locally first
        req.logout((err) => {
          if (err) {
            return next(err);
          }
          // Then redirect to IdP logout
          res.redirect(logoutUrl);
        });
      } else {
        // If no SAML logout available, just do local logout
        req.logout((err) => {
          if (err) {
            return next(err);
          }
          res.redirect('/auth/login');
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle SAML logout callback from IdP
   */
  async logoutCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // SAML logout completed, redirect to login page
      res.redirect('/auth/login');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate SP metadata for IdP configuration
   */
  async metadata(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { institution } = req.params;
      
      if (!institution) {
        throw new CustomError('VALIDATION_ERROR', 'Institution identifier is required');
      }
      
      // Get the strategy
      const strategy = await this.getStrategy(institution);
      
      // Generate metadata
      const metadata = await new Promise<string>((resolve, reject) => {
        if (typeof strategy.generateServiceProviderMetadata === 'function') {
          const callbackUrl = `${req.protocol}://${req.get('host')}/api/auth/saml/callback/${institution}`;
          const metadata = strategy.generateServiceProviderMetadata(
            null, 
            callbackUrl
          );
          resolve(metadata);
        } else {
          // Fallback if strategy doesn't support metadata generation
          const issuer = process.env.SAML_ISSUER || 'thinkleap';
          const callbackUrl = `${req.protocol}://${req.get('host')}/api/auth/saml/callback/${institution}`;
          const metadata = this.samlService.generateServiceProviderMetadata(issuer, callbackUrl);
          resolve(metadata);
        }
      });
      
      res.header('Content-Type', 'text/xml').send(metadata);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get list of available institutions
   */
  async getInstitutions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const federationName = req.query.federation as string;
      
      if (federationName) {
        // Get institutions for a specific federation
        const providers = await this.samlService.getFederationProviders(federationName);
        res.json({ institutions: providers });
      } else {
        // Get all institutions
        const institutions = await this.samlService.getFederationProviders('all');
        res.json({ institutions });
      }
    } catch (error) {
      next(error);
    }
  }
}