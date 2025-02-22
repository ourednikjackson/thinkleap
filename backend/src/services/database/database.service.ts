import { DatabaseConfig } from '@/config/types';
import { Pool, QueryResult } from 'pg';

export class DatabaseService {
    private pool: Pool;
    private isConnected: boolean = false;

    constructor(config: DatabaseConfig) {
        this.pool = new Pool({
            user: process.env.DB_USER,
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            password: process.env.DB_PASSWORD,
            port: parseInt(process.env.DB_PORT || '5432'),
        });

        // Handle pool errors
        this.pool.on('error', (err) => {
            console.error('Unexpected error on idle client', err);
            process.exit(-1);
        });
    }

    async connect(): Promise<void> {
        try {
            // Test the connection
            const client = await this.pool.connect();
            client.release();
            this.isConnected = true;
            console.log('Successfully connected to database');
        } catch (error) {
            this.isConnected = false;
            throw new Error(`Failed to connect to database: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async disconnect(): Promise<void> {
        try {
            await this.pool.end();
            this.isConnected = false;
            console.log('Successfully disconnected from database');
        } catch (error) {
            throw new Error(`Failed to disconnect from database: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async checkConnection(): Promise<boolean> {
        try {
            const client = await this.pool.connect();
            client.release();
            return true;
        } catch (error) {
            return false;
        }
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