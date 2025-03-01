import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth/auth.service';
import { TokenService } from '../services/auth/token.service';
import { EmailService } from '../services/email/email.service';
import { PasswordResetService } from '../services/auth/password-reset.service';
import { ValidationService } from '../services/validation/validation.service';
import { RegisterUserDTO, LoginUserDTO, AuthResponse } from '../types/auth.types';
import { CustomError } from '../errors/customError';

export class AuthController {
    constructor(
        private authService: AuthService,
        private tokenService: TokenService,
        private emailService: EmailService,
        private passwordResetService: PasswordResetService,
        private validationService: ValidationService
    ) {}

    async signup(req: Request<{}, {}, RegisterUserDTO>, res: Response<AuthResponse>, next: NextFunction) {
        try {
            const { email, password, fullName } = req.body;

            // Check if user exists
            const existingUser = await this.authService.findUserByEmail(email);
            if (existingUser) {
                throw new CustomError('DUPLICATE_ENTRY', 'Email already registered');
            }

            // Create user
            const user = await this.authService.createUser(email, password, fullName);

            // Generate tokens
            const accessToken = this.tokenService.generateAccessToken(user.id);
            const refreshToken = this.tokenService.generateRefreshToken(user.id);

            // Send verification email
            await this.emailService.sendVerificationEmail(
                user.email,
                user.emailVerificationToken
            );

            res.status(201).json({
                success: true,
                message: 'User created successfully. Please verify your email.',
                accessToken,
                refreshToken,
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.fullName,
                    emailVerified: user.emailVerified
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async login(req: Request<{}, {}, LoginUserDTO>, res: Response<AuthResponse>, next: NextFunction) {
        try {
            const { email, password } = req.body;

            // Authenticate user
            const user = await this.authService.login(email, password);

            // Generate tokens
            const accessToken = this.tokenService.generateAccessToken(user.id);
            const refreshToken = this.tokenService.generateRefreshToken(user.id);

            res.json({
                success: true,
                message: 'Login successful',
                accessToken,
                refreshToken,
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.fullName,
                    emailVerified: user.emailVerified
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async verifyEmail(req: Request, res: Response, next: NextFunction) {
        try {
            const { token } = req.params;
            await this.authService.verifyEmail(token);
            res.json({ message: 'Email verified successfully' });
        } catch (error) {
            next(error);
        }
    }

    async refreshToken(req: Request, res: Response, next: NextFunction) {
        try {
            const { refreshToken } = req.body;
            const userId = await this.tokenService.verifyRefreshToken(refreshToken);
            const newAccessToken = this.tokenService.generateAccessToken(userId);

            res.json({ accessToken: newAccessToken });
        } catch (error) {
            next(error);
        }
    }

    async logout(req: Request, res: Response, next: NextFunction) {
        try {
            const { refreshToken } = req.body;
            await this.tokenService.revokeRefreshToken(refreshToken);
            res.json({ message: 'Logged out successfully' });
        } catch (error) {
            next(error);
        }
    }

    async requestPasswordReset(req: Request, res: Response, next: NextFunction) {
        try {
            const { email } = req.body;
            if (!email) {
                throw new CustomError('VALIDATION_ERROR', 'Email is required');
            }
            await this.passwordResetService.createResetToken(email);
            res.json({
                success: true,
                message: 'If your email exists in our system, you will receive password reset instructions'
            });
        } catch (error) {
            next(error);
        }
    }

    async resetPassword(req: Request, res: Response, next: NextFunction) {
        try {
            const { token, password } = req.body;
            if (!token || !password) {
                throw new CustomError('VALIDATION_ERROR', 'Token and password are required');
            }
            const passwordValidation = this.validationService.validatePassword(password);
            if (!passwordValidation.isValid) {
                throw new CustomError('VALIDATION_ERROR', 'Invalid password', {
                    password: passwordValidation.errors.join(', ')
                });
            }
            const success = await this.passwordResetService.resetPassword(token, password);
            if (!success) {
                throw new CustomError('INVALID_TOKEN', 'Invalid or expired token');
            }
            res.json({
                success: true,
                message: 'Password reset successfully'
            });
        } catch (error) {
            next(error);
        }
    }
}