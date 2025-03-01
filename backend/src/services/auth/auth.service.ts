import bcrypt from 'bcrypt';
import { ValidationService } from '../validation/validation.service';
import { DatabaseService } from '../database/database.service';
import { AuthError, AuthErrorType, RegisterUserDTO, AuthResponse } from '../../types/auth.types';
import { CustomError } from '../../errors/customError';

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
        return this.databaseService.findUserByEmail(email);
    }

    async createUser(email: string, password: string, fullName: string) {
        const hashedPassword = await bcrypt.hash(password, AuthService.SALT_ROUNDS);
        return this.databaseService.createUser({
            email,
            password: hashedPassword,
            fullName
        });
    }

    async login(email: string, password: string) {
        const user = await this.findUserByEmail(email);
        if (!user) {
            throw new CustomError('INVALID_CREDENTIALS', 'Invalid credentials');
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            throw new CustomError('INVALID_CREDENTIALS', 'Invalid credentials');
        }

        return user;
    }

    async verifyEmail(token: string) {
        return this.databaseService.verifyEmail(token);
    }

    async registerUser(userData: RegisterUserDTO): Promise<AuthResponse> {
        try {
            // Validate input
            if (!this.validationService.validateEmail(userData.email)) {
                throw new CustomError('VALIDATION_ERROR', 'Invalid email format');
            }

            const passwordValidation = this.validationService.validatePassword(userData.password);
            if (!passwordValidation.isValid) {
                throw new CustomError('VALIDATION_ERROR', 'Invalid password', {
                    password: passwordValidation.errors.join(', ')
                });
            }

            // Check for existing user
            const existingUser = await this.databaseService.findUserByEmail(userData.email);
            if (existingUser) {
                throw new CustomError('DUPLICATE_ENTRY', 'Email already registered');
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
            if (error instanceof CustomError) {
                throw error;
            }
            throw new CustomError('SERVER_ERROR', 'Error registering user');
        }
    }
}