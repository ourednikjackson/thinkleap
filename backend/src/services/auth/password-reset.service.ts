// /backend/src/services/auth/password-reset.service.ts
import { randomBytes } from 'crypto';
import { DatabaseService } from '../database/database.service';
import { EmailService } from '../email/email.service';
import { AuthService } from './auth.service';

export class PasswordResetService {
  constructor(
    private databaseService: DatabaseService,
    private emailService: EmailService,
    private authService: AuthService
  ) {}

  async generateResetToken(): Promise<string> {
    return randomBytes(32).toString('hex');
  }

  async createResetToken(email: string): Promise<boolean> {
    // Check if user exists
    const user = await this.databaseService.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (user.rows.length === 0) {
      // Don't reveal that the user doesn't exist
      return false;
    }

    const userId = user.rows[0].id;
    const token = await this.generateResetToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token valid for 1 hour

    // Store token in database
    await this.databaseService.query(
      `INSERT INTO password_resets (id, user_id, reset_token, expires_at)
       VALUES (uuid_generate_v4(), $1, $2, $3)
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         reset_token = $2,
         expires_at = $3,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, token, expiresAt]
    );

    // Send reset email
    await this.emailService.sendPasswordResetEmail(email, token);

    return true;
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    // Validate token
    const resetRecord = await this.databaseService.query(
      `SELECT user_id, expires_at 
       FROM password_resets 
       WHERE reset_token = $1`,
      [token]
    );

    if (resetRecord.rows.length === 0) {
      return false;
    }

    const { user_id, expires_at } = resetRecord.rows[0];
    
    // Check if token is expired
    if (new Date() > new Date(expires_at)) {
      return false;
    }

    // Hash new password
    const hashedPassword = await this.authService.hashPassword(newPassword);

    // Update user password
    await this.databaseService.query(
      `UPDATE users 
       SET password_hash = $1, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [hashedPassword, user_id]
    );

    // Delete reset token
    await this.databaseService.query(
      'DELETE FROM password_resets WHERE user_id = $1',
      [user_id]
    );

    return true;
  }
}