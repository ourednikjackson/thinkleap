import { DatabaseService } from '../database/database.service';
import { User, UpdateUserDTO } from '../../types/user.types';
import { CustomError } from '../../errors/customError';

export class UserService {
    constructor(private databaseService: DatabaseService) {}

    async findById(id: string): Promise<User | null> {
        const result = await this.databaseService.query(
            `SELECT id, email, name as "fullName", email_verified as "emailVerified", 
                   status, created_at as "createdAt", updated_at as "updatedAt" 
             FROM users 
             WHERE id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    async findByEmail(email: string): Promise<User | null> {
        const result = await this.databaseService.query(
            `SELECT id, email, name as "fullName", email_verified as "emailVerified", 
                   status, created_at as "createdAt", updated_at as "updatedAt" 
             FROM users 
             WHERE email = $1`,
            [email]
        );
        return result.rows[0] || null;
    }

    async update(id: string, data: UpdateUserDTO): Promise<User> {
        const result = await this.databaseService.query(
            `UPDATE users 
             SET 
                name = COALESCE($2, name),
                email = COALESCE($3, email),
                status = COALESCE($4, status),
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING id, email, name as "fullName", email_verified as "emailVerified", 
                       status, created_at as "createdAt", updated_at as "updatedAt"`,
            [id, data.fullName, data.email, data.status]
        );
        
        if (!result.rows[0]) {
            throw new CustomError('NOT_FOUND', 'User not found');
        }
        
        return result.rows[0];
    }

    async delete(id: string): Promise<void> {
        const result = await this.databaseService.query(
            'DELETE FROM users WHERE id = $1',
            [id]
        );
        
        if (result.rowCount === 0) {
            throw new CustomError('NOT_FOUND', 'User not found');
        }
    }

    async updateLastLogin(id: string): Promise<void> {
        await this.databaseService.query(
            `UPDATE users 
             SET last_login = CURRENT_TIMESTAMP 
             WHERE id = $1`,
            [id]
        );
    }
}