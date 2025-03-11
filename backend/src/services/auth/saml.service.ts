import { Request } from 'express';
import passport from 'passport';
import { Strategy as SamlStrategy } from 'passport-saml';
import { v4 as uuidv4 } from 'uuid';
import { CacheService } from '../cache';
import { DatabaseService } from '../database/database.service';
import { Logger } from '../logger';
import { CustomError } from '../../errors/customError';

export interface SamlConfig {
  callbackUrl: string;
  entryPoint: string;
  issuer: string;
  cert: string;
  identifierFormat: string;
  signatureAlgorithm: string;
  disableRequestedAuthnContext: boolean;
}

export interface SamlUserProfile {
  nameID: string;
  nameIDFormat: string;
  sessionIndex: string;
  eduPersonPrincipalName?: string;
  mail?: string;
  givenName?: string;
  sn?: string;
  organizationName?: string;
  [key: string]: any;
}

export interface SamlSession {
  id: string;
  userId: string;
  clientId: string;
  sessionIndex: string;
  expiresAt: Date;
}

export class SamlService {
  private strategies: Map<string, SamlStrategy> = new Map();
  
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
    private readonly logger: Logger,
    private readonly baseUrl: string
  ) {}

  async initializeStrategies(): Promise<void> {
    try {
      // Load all clients
      const clients = await this.databaseService.getClients();
      
      // Initialize strategies for each client
      for (const client of clients) {
        if (!client.idp_metadata && !client.idp_entity_id) {
          this.logger.warn(`Client ${client.name} has no IdP configuration`);
          continue;
        }
        
        await this.createStrategy(client);
      }
      
      this.logger.info(`Initialized ${this.strategies.size} SAML strategies`);
    } catch (error) {
      this.logger.error('Failed to initialize SAML strategies', error as Error);
      throw new CustomError('SERVER_ERROR', 'Failed to initialize authentication system');
    }
  }
  
  private async createStrategy(client: any): Promise<void> {
    try {
      const config: SamlConfig = {
        callbackUrl: `${this.baseUrl}/api/auth/saml/callback/${client.id}`,
        entryPoint: client.idp_entity_id, 
        issuer: `thinkleap-${client.id}`,
        cert: client.idp_certificate || '',
        identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
        signatureAlgorithm: 'sha256',
        disableRequestedAuthnContext: true
      };
      
      const strategy = new SamlStrategy(
        {
          path: config.callbackUrl,
          entryPoint: config.entryPoint,
          issuer: config.issuer,
          cert: config.cert,
          identifierFormat: config.identifierFormat,
          signatureAlgorithm: config.signatureAlgorithm,
          disableRequestedAuthnContext: config.disableRequestedAuthnContext,
          passReqToCallback: true
        },
        (req: Request, profile: any, done: any) => {
          return done(null, profile);
        }
      );
      
      this.strategies.set(client.id, strategy);
      this.logger.debug(`Created SAML strategy for client: ${client.name}`);
    } catch (error) {
      this.logger.error(`Failed to create SAML strategy for client ${client.id}`, error as Error);
      throw error;
    }
  }
  
  getStrategy(clientId: string): SamlStrategy | undefined {
    return this.strategies.get(clientId);
  }
  
  async processCallback(clientId: string, profile: SamlUserProfile): Promise<{ user: any, sessionId: string }> {
    try {
      // Extract user information from SAML profile
      const email = profile.mail || profile.eduPersonPrincipalName || profile.nameID;
      const fullName = profile.givenName && profile.sn 
        ? `${profile.givenName} ${profile.sn}` 
        : profile.nameID;
        
      // Find or create user
      let user = await this.databaseService.findUserByEmail(email);
      
      if (!user) {
        // Create a new user with minimal information
        user = await this.databaseService.createUserWithSaml({
          email,
          fullName,
          // Generate a random password for SAML users
          password: Math.random().toString(36).substring(2, 15),
          clientId
        });
        
        this.logger.info(`Created new user via SAML authentication: ${email}`);
      }
      
      // Create SAML session
      const sessionId = uuidv4();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24-hour session
      
      const sessionData: SamlSession = {
        id: sessionId,
        userId: user.id,
        clientId,
        sessionIndex: profile.sessionIndex,
        expiresAt
      };
      
      // Store session in database for persistence
      await this.databaseService.createSamlSession(sessionData);
      
      // Store session in Redis for fast lookup
      await this.cacheService.set(`saml:session:${sessionId}`, sessionData, { ttl: 86400 }); // 24 hours
      
      return { user, sessionId };
    } catch (error) {
      this.logger.error('Error processing SAML callback', error as Error);
      throw new CustomError('SERVER_ERROR', 'Failed to process authentication');
    }
  }
  
  async getUserFromSession(sessionId: string): Promise<any | null> {
    try {
      // Try to get session from Redis first
      let session = await this.cacheService.get<SamlSession>(`saml:session:${sessionId}`);
      
      // If not found in Redis, try database
      if (!session) {
        session = await this.databaseService.getSamlSession(sessionId);
        
        // If found in database, update Redis
        if (session) {
          await this.cacheService.set(`saml:session:${sessionId}`, session, { ttl: 86400 });
        }
      }
      
      if (!session || new Date(session.expiresAt) < new Date()) {
        return null;
      }
      
      return this.databaseService.getUserById(session.userId);
    } catch (error) {
      this.logger.error('Error retrieving user from session', error as Error);
      return null;
    }
  }
  
  async logout(sessionId: string): Promise<boolean> {
    try {
      // Remove from Redis
      await this.cacheService.delete(`saml:session:${sessionId}`);
      
      // Remove from database
      await this.databaseService.deleteSamlSession(sessionId);
      
      return true;
    } catch (error) {
      this.logger.error('Error logging out SAML session', error as Error);
      return false;
    }
  }
}
