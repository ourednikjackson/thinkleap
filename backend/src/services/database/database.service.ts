// backend/src/services/database/database.service.ts
import { Pool, QueryResult } from 'pg';

export class DatabaseService {
    private pool: Pool;

    constructor() {
        this.pool = new Pool({
            user: process.env.DB_USER,
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            password: process.env.DB_PASSWORD,
            port: parseInt(process.env.DB_PORT || '5432'),
        });
    }

    async findUserByEmail(email: string) {
        const result = await this.pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        return result.rows[0];
    }

    async createUser(userData: { email: string; password: string; fullName: string }) {
        const result = await this.pool.query(
            'INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING *',
            [userData.email, userData.password, userData.fullName]
        );
        return result.rows[0];
    }

    async query(text: string, params?: any[]): Promise<QueryResult> {
        return this.pool.query(text, params);
    }

    async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}