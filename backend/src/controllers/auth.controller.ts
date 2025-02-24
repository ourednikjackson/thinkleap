// backend/src/controllers/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth/auth.service';
import { TokenService } from '../services/auth/token.service';
import { EmailService } from '../services/email/email.service';
import { PasswordResetService } from '../services/auth/password-reset.service';
import { ValidationService } from '../services/validation/validation.service';
import { 
    RegisterUserDTO, 
    LoginUserDTO, 
    AuthResponse,
    AuthError,
    AuthErrorType,
    createAuthError 
} from '../types/auth.types';

const tokenService = new TokenService();

export const refreshToken = (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  try {
    const userId = tokenService.verifyRefreshToken(refreshToken);
    const newAccessToken = tokenService.generateAccessToken(userId);
    res.json({ accessToken: newAccessToken });
  } catch (error) {
    return res.status(403).json({ error: 'Invalid refresh token' });
  }
};

export class AuthController {
  constructor(
    private authService: AuthService,
    private tokenService: TokenService,
    private emailService: EmailService,
    private passwordResetService: PasswordResetService,
    private validationService: ValidationService
  ) {}

  async signup(req: Request<{}, {}, RegisterUserDTO>, res: Response<AuthResponse>) {
    try {
      const { email, password, fullName } = req.body;

      // Check if user exists
      const existingUser = await this.authService.findUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({
            success: false,
            message: 'Email already registered',
            error: createAuthError(AuthErrorType.DUPLICATE, 'Email already registered')
        });
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
      res.status(500).json({
          success: false,
          message: 'Error creating user',
          error: {
              type: AuthErrorType.SERVER,
              message: 'Failed to create user',
              details: {} // Add relevant details
          }
      });
    }
  }

  async login(req: Request<{}, {}, LoginUserDTO>, res: Response<AuthResponse>) {
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
        res.status(401).json({
            success: false,
            message: 'Invalid credentials',
            error: {
                type: AuthErrorType.VALIDATION,
                message: 'Invalid email or password',
                details: {}
            }
        });
    }
  }

  async verifyEmail(req: Request, res: Response) {
    try {
      const { token } = req.params;
      await this.authService.verifyEmail(token);
      res.json({ message: 'Email verified successfully' });
    } catch (error) {
      res.status(400).json({ error: 'Invalid verification token' });
    }
  }

  async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      const userId = await this.tokenService.verifyRefreshToken(refreshToken);
      const newAccessToken = this.tokenService.generateAccessToken(userId);
      
      res.json({ accessToken: newAccessToken });
    } catch (error) {
      res.status(401).json({ error: 'Invalid refresh token' });
    }
  }

  async logout(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      await this.tokenService.revokeRefreshToken(refreshToken);
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Error logging out' });
    }
  }

  async requestPasswordReset(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }
      // We don't reveal if the email exists in our system for security reasons
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
        return res.status(400).json({
          success: false,
          message: 'Token and password are required'
        });
      }
      // Validate password
      const passwordValidation = this.validationService.validatePassword(password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid password',
          errors: passwordValidation.errors
        });
      }
      const success = await this.passwordResetService.resetPassword(token, password);
      if (!success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired token'
        });
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