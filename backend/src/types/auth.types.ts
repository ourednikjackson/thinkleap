import { Request } from 'express';
import { Profile } from 'passport-saml';

export interface AuthenticatedUser {
    userId: string;  // Changed from id to userId to match middleware
    institutionId?: string;  // Added for SAML authentication
    authType: 'jwt' | 'saml'; // Type of authentication used
}

export interface AuthenticatedRequest extends Request {
    user: AuthenticatedUser;
}

export interface RegisterUserDTO {
    email: string;
    password: string;
    fullName: string;
}

export interface AuthResponse {
    success: boolean;
    message?: string;
    error?: AuthError;
    accessToken?: string;    
    refreshToken?: string;   
    samlSession?: boolean;    // Indicates if user is authenticated via SAML
    institutionId?: string;   // Added for SAML authentication
    user?: {
        id: string;
        email: string;
        fullName: string;
        emailVerified: boolean;
        institutionId?: string; // Added for SAML authentication
    };
}

// Add to auth.types.ts
export function createAuthError(type: AuthErrorType, message: string): AuthError {
    return {
        type,
        message,
        details: {} as Record<string, string>
    };
}

export enum AuthErrorType {
    VALIDATION = 'VALIDATION',
    DUPLICATE = 'DUPLICATE',
    SERVER = 'SERVER',
    SAML_ERROR = 'SAML_ERROR'
}

export interface AuthError {
    type: AuthErrorType;
    message: string;
    details?: Record<string, string>;
}

export interface LoginUserDTO {
    email: string;
    password: string;
}

export interface RefreshTokenDTO {
    refreshToken: string;
}

// SAML specific types
export interface SamlUser {
    nameID: string;
    nameIDFormat: string;
    sessionIndex?: string;
    attributes: any;
    institutionId: string;
    userId?: string; // Linked user ID if exists
}

export interface SamlConfig {
    entryPoint: string;
    issuer: string;
    cert: string;
    identifierFormat?: string;
    signatureAlgorithm?: string;
    validateInResponseTo?: boolean;
    disableRequestedAuthnContext?: boolean;
    acceptedClockSkewMs?: number;
    logoutUrl?: string;
}

export interface SamlAuthDTO {
    SAMLResponse: string;
    RelayState?: string;
}

export interface SamlProfileMapping {
    nameID: string;
    email: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    affiliation?: string;
}

export interface SamlMetadata {
    entityID: string;
    contactPerson: {
        technical: {
            emailAddress: string;
            givenName: string;
        };
    };
    endpoints: {
        singleSignOnService: { url: string, binding: string }[];
        singleLogoutService?: { url: string, binding: string }[];
    };
}