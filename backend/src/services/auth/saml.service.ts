import { Profile, SamlConfig, VerifyCallback } from 'passport-saml';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../database/database.service';
import { CacheService } from '../cache';
import { LoggerService } from '../logger/logger.service';
import { SamlUser, SamlProfileMapping, SamlMetadata } from '../../types/auth.types';
import { CustomError } from '../../errors/customError';
import { AuthService } from './auth.service';
import { Request } from 'express';

export class SamlService {
  private defaultProfileMapping: SamlProfileMapping = {
    nameID: 'nameID',
    email: 'email',
    firstName: 'givenName',
    lastName: 'surname',
    displayName: 'displayName',
    affiliation: 'eduPersonAffiliation'
  };

  constructor(
    private databaseService: DatabaseService,
    private cacheService: CacheService,
    private logger: LoggerService,
    private authService: AuthService
  ) {}

  /**
   * Get SAML configuration for a specific institution
   * @param institutionId Institution ID or domain
   */
  async getSamlConfig(institutionIdOrDomain: string): Promise<SamlConfig> {
    try {
      // First, determine if we're dealing with a domain or an ID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(institutionIdOrDomain);
      
      let provider;
      if (isUUID) {
        provider = await this.databaseService.knex('saml_identity_providers')
          .where('institution_id', institutionIdOrDomain)
          .first();
      } else {
        // It's a domain, find the institution first, then the provider
        const institution = await this.databaseService.knex('institutions')
          .where('domain', institutionIdOrDomain)
          .first();
        
        if (!institution) {
          throw new CustomError('NOT_FOUND', `Institution not found for domain: ${institutionIdOrDomain}`);
        }
        
        provider = await this.databaseService.knex('saml_identity_providers')
          .where('institution_id', institution.id)
          .first();
      }

      if (!provider) {
        throw new CustomError('NOT_FOUND', 'SAML Identity Provider configuration not found');
      }

      const samlConfig: SamlConfig = {
        entryPoint: provider.sso_login_url,
        issuer: process.env.SAML_ISSUER || 'thinkleap',
        cert: provider.certificate,
        identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
        validateInResponseTo: true,
        disableRequestedAuthnContext: true,
        acceptedClockSkewMs: 300000 // 5 minutes
      };

      if (provider.sso_logout_url) {
        samlConfig.logoutUrl = provider.sso_logout_url;
      }

      return samlConfig;
    } catch (error) {
      this.logger.error('Error getting SAML config', { error, institutionIdOrDomain });
      throw new CustomError('SAML_CONFIG_ERROR', 'Error fetching SAML configuration');
    }
  }

  /**
   * Verify SAML response and create/update user
   */
  async verifySamlResponse(profile: Profile, done: VerifyCallback, req: Request): Promise<void> {
    try {
      // Extract domain from email
      const email = profile.email || profile.nameID;
      const domain = email.split('@')[1];

      if (!domain) {
        return done(new Error('Invalid email format in SAML response'));
      }

      // Find institution by domain
      const institution = await this.databaseService.knex('institutions')
        .where('domain', domain)
        .first();

      if (!institution) {
        return done(new Error(`No institution found for domain: ${domain}`));
      }

      // Check if user already exists
      let user = await this.authService.findUserByEmail(email);
      let userId = user?.id;

      // Start a transaction for user operations
      await this.databaseService.knex.transaction(async (trx) => {
        // Create user if doesn't exist
        if (!user) {
          const fullName = this.extractNameFromProfile(profile);
          
          // Create user without password for SAML users
          const newUser = {
            id: uuidv4(),
            email,
            password_hash: '', // Empty for SAML users
            name: fullName,
            created_at: new Date(),
            updated_at: new Date(),
            email_verified: true // SAML users are pre-verified
          };
          
          await trx('users').insert(newUser);
          userId = newUser.id;
          
          // Create user-institution mapping
          await trx('user_institutions').insert({
            id: uuidv4(),
            user_id: userId,
            institution_id: institution.id,
            institutional_email: email,
            is_primary: true,
            created_at: new Date(),
            updated_at: new Date()
          });
        } else {
          // Check if user already has this institution
          const userInstitution = await trx('user_institutions')
            .where({
              user_id: userId,
              institution_id: institution.id
            })
            .first();
          
          // If not, create the relationship
          if (!userInstitution) {
            await trx('user_institutions').insert({
              id: uuidv4(),
              user_id: userId,
              institution_id: institution.id,
              institutional_email: email,
              is_primary: false, // Not primary if user already exists
              created_at: new Date(),
              updated_at: new Date()
            });
          }
        }

        // Store session information
        if (req.session) {
          req.session.institutionId = institution.id;
          req.session.samlSession = true;
          req.session.samlNameId = profile.nameID;
          req.session.samlSessionIndex = profile.sessionIndex;
        }
      });

      // Create the authenticated user object
      const samlUser: SamlUser = {
        nameID: profile.nameID,
        nameIDFormat: profile?.nameIDFormat || 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
        sessionIndex: profile.sessionIndex,
        attributes: profile,
        institutionId: institution.id,
        userId
      };

      // Cache SAML association for session
      if (userId) {
        await this.cacheService.set(`saml:user:${profile.nameID}`, userId, 60 * 60 * 24); // 24 hours cache
      }

      done(null, samlUser);
    } catch (error) {
      this.logger.error('SAML verification error', { error, nameID: profile.nameID });
      done(error as Error);
    }
  }

  /**
   * Extract full name from SAML profile
   */
  private extractNameFromProfile(profile: Profile): string {
    // Try to get displayName first
    if (profile.displayName) {
      return profile.displayName;
    }
    
    // Try to get first and last name
    const firstName = profile[this.defaultProfileMapping.firstName as keyof Profile] as string | undefined;
    const lastName = profile[this.defaultProfileMapping.lastName as keyof Profile] as string | undefined;
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`.trim();
    }
    
    // Fallback to email prefix
    const email = profile.email || profile.nameID;
    return email.split('@')[0];
  }

  /**
   * Generate SP metadata for IdP configuration
   */
  generateServiceProviderMetadata(issuer: string, callbackUrl: string): string {
    const metadata = {
      entityID: issuer,
      contactPerson: {
        technical: {
          emailAddress: process.env.SAML_TECHNICAL_CONTACT || 'support@thinkleap.io',
          givenName: 'ThinkLeap Support'
        }
      },
      endpoints: {
        singleSignOnService: [
          {
            binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
            url: callbackUrl
          }
        ]
      }
    };
    
    return JSON.stringify(metadata);
  }

  /**
   * Get federation information
   */
  async getFederationProviders(federationName: string): Promise<SamlMetadata[]> {
    try {
      const providers = await this.databaseService.knex('saml_identity_providers')
        .join('institutions', 'saml_identity_providers.institution_id', 'institutions.id')
        .where({
          'saml_identity_providers.is_federated': true,
          'saml_identity_providers.federation_name': federationName
        })
        .select(
          'institutions.name',
          'institutions.domain',
          'saml_identity_providers.entity_id as entityId',
          'saml_identity_providers.sso_login_url as loginUrl'
        );
      
      return providers.map(p => ({
        entityID: p.entityId,
        name: p.name,
        domain: p.domain,
        contactPerson: { technical: { emailAddress: '', givenName: '' } },
        endpoints: {
          singleSignOnService: [{ url: p.loginUrl, binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect' }]
        }
      }));
    } catch (error) {
      this.logger.error('Error getting federation providers', { error, federationName });
      throw new CustomError('SAML_FEDERATION_ERROR', 'Error fetching federation providers');
    }
  }
}