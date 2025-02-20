// backend/src/services/auth/auth.service.ts
import bcrypt from 'bcrypt';
import { db } from '../database/connection';
import { ValidationService } from '../validation/validation.service';
import { DatabaseService } from '../database/database.service';
import { AuthError, AuthErrorType, RegisterUserDTO, AuthResponse } from '../../types/auth.types';

const SALT_ROUNDS = 12;

export class AuthService {
    private static SALT_ROUNDS = 12;

    constructor(
        private validationService: ValidationService,
        private databaseService: DatabaseService
    ) {}

    async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, SALT_ROUNDS);
    }

    async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
        return bcrypt.compare(plainPassword, hashedPassword);
    }

    async findUserByEmail(email: string) {
        const result = await db.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        return result.rows[0];
    }

    async createUser(email: string, password: string, fullName: string) {
        const hashedPassword = await bcrypt.hash(password, AuthService.SALT_ROUNDS);
        const result = await db.query(
            `INSERT INTO users (email, password_hash, full_name)
             VALUES ($1, $2, $3)
             RETURNING id, email, full_name`,
            [email, hashedPassword, fullName]
        );
        return result.rows[0];
    }

    async login(email: string, password: string) {
        const user = await this.findUserByEmail(email);
        if (!user) {
            throw new Error('Invalid credentials');
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            throw new Error('Invalid credentials');
        }

        return user;
    }

    async verifyEmail(token: string) {
        const result = await db.query(
            `UPDATE users 
             SET email_verified = true,
             email_verification_token = null
             WHERE email_verification_token = $1
             RETURNING id`,
            [token]
        );
        
        if (result.rows.length === 0) {
            throw new Error('Invalid verification token');
        }
        
        return result.rows[0];
    }

    async registerUser(userData: RegisterUserDTO): Promise<AuthResponse> {
        try {
            // Validate input
            if (!this.validationService.validateEmail(userData.email)) {
                throw this.createError(AuthErrorType.VALIDATION, 'Invalid email format');
            }

            const passwordValidation = this.validationService.validatePassword(userData.password);
            if (!passwordValidation.isValid) {
                throw this.createError(AuthErrorType.VALIDATION, 'Invalid password', {
                    password: passwordValidation.errors.join(', ')
                });
            }

            // Check for existing user
            const existingUser = await this.databaseService.findUserByEmail(userData.email);
            if (existingUser) {
                throw this.createError(AuthErrorType.DUPLICATE, 'Email already registered');
            }

            // Hash password
            const hashedPassword = await this.hashPassword(userData.password);

            // Create user
            const user = await this.databaseService.createUser({
                ...userData,
                password: hashedPassword
            });

            return {
                success: true,
                message: 'User registered successfully'
            };
        } catch (error) {
            if (error && typeof error === 'object' && 'type' in error) {
                throw error as AuthError;
            }
            throw this.createError(AuthErrorType.SERVER, 'Error registering user');
        }
    }

    private createError(type: AuthErrorType, message: string, details?: Record<string, string>): AuthError {
        return {
            type,
            message,
            details
        };
    }
}