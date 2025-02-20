import { Request } from 'express';

export interface AuthenticatedUser {
    userId: string;  // Changed from id to userId to match middleware
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
    accessToken?: string;    // Add this
    refreshToken?: string;   // Add this
    user?: {
        id: string;
        email: string;
        fullName: string;
        emailVerified: boolean;
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
    SERVER = 'SERVER'
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