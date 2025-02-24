// /backend/src/services/user/institution-verification.service.ts
import { randomBytes } from 'crypto';
import { DatabaseService } from '../database/database.service';
import { EmailService } from '../email/email.service';

export class InstitutionVerificationService {
  constructor(
    private databaseService: DatabaseService,
    private emailService: EmailService
  ) {}

  async generateVerificationCode(): Promise<string> {
    // Generate a 6-digit code
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async createVerification(userId: string, institutionEmail: string): Promise<string> {
    // Validate that email is from an educational institution
    if (!this.isInstitutionalEmail(institutionEmail)) {
      throw new Error('Email must be from an educational institution (.edu domain)');
    }

    // Generate verification code
    const verificationCode = await this.generateVerificationCode();

    // Store verification in database
    await this.databaseService.query(
      `INSERT INTO institution_verifications 
       (id, user_id, institution_email, verification_code)
       VALUES (uuid_generate_v4(), $1, $2, $3)
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         institution_email = $2,
         verification_code = $3,
         verified_at = NULL,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, institutionEmail, verificationCode]
    );

    // Send verification code to email
    await this.emailService.sendInstitutionVerificationEmail(institutionEmail, verificationCode);

    return verificationCode;
  }

  async verifyCode(userId: string, code: string): Promise<boolean> {
    const result = await this.databaseService.query(
      `UPDATE institution_verifications
       SET verified_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND verification_code = $2 AND verified_at IS NULL
       RETURNING id`,
      [userId, code]
    );
    
    // Add null check before using rowCount
    return result && result.rowCount ? result.rowCount > 0 : false;
  }

  async getVerificationStatus(userId: string): Promise<{
    institutionEmail: string | null;
    verified: boolean;
    verifiedAt: Date | null;
  }> {
    const result = await this.databaseService.query(
      `SELECT institution_email, verified_at
       FROM institution_verifications
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return {
        institutionEmail: null,
        verified: false,
        verifiedAt: null
      };
    }

    return {
      institutionEmail: result.rows[0].institution_email,
      verified: !!result.rows[0].verified_at,
      verifiedAt: result.rows[0].verified_at
    };
  }

  private isInstitutionalEmail(email: string): boolean {
    return email.toLowerCase().endsWith('.edu');
  }
}