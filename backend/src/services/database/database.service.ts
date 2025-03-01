// backend/src/services/database/database.service.ts
import { Pool, QueryResult, PoolClient } from 'pg';
import { Logger } from '@/services/logger/types';
import { ConsoleLoggerAdapter } from '@/services/logger/console-adapter';

export interface DatabaseConfig {
  user: string;
  host: string;
  database: string;
  password: string;
  port: number;
  ssl?: boolean;
}

export class DatabaseService {
  private static instance: DatabaseService | null = null;

  private pool: Pool | null = null;
  private isConnected: boolean = false;
  private mockMode: boolean = false;
  private logger: Logger;
  private mockData: Record<string, any[]> = {
    users: [],
  };

  private constructor(config: DatabaseConfig, logger?: Logger) {
    this.logger = logger || new ConsoleLoggerAdapter();

    try {
      if (this.validateConfig(config)) {
        this.pool = new Pool({
          user: config.user,
          host: config.host,
          database: config.database,
          password: config.password,
          port: config.port,
          ssl: config.ssl,
          connectionTimeoutMillis: 10000,
          idleTimeoutMillis: 30000,
        });

        this.pool.on('error', (err) => {
          this.logger.error('Unexpected error on idle client', err);
        });
      } else {
        this.logger.warn('Invalid database configuration. Will use mock mode.');
        this.mockMode = true;
      }
    } catch (error) {
      this.logger.error('Error initializing database pool', error as Error);
      this.mockMode = true;
    }
  }

  public static getInstance(config: DatabaseConfig, logger?: Logger): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService(config, logger);
    }
    return DatabaseService.instance;
  }

  async connect(): Promise<void> {
    if (this.mockMode) {
      this.logger.info('Running in database mock mode');
      this.isConnected = true;
      return;
    }

    try {
      if (!this.pool) {
        throw new Error('Database pool not initialized');
      }

      const client = await this.pool.connect();
      client.release();
      this.isConnected = true;
      this.logger.info('Successfully connected to database');
    } catch (error) {
      this.isConnected = false;
      this.logger.error('Failed to connect to database', error as Error);
      this.logger.warn('Switching to mock mode due to connection failure');
      this.mockMode = true;
      this.isConnected = true;
    }
  }

  async disconnect(): Promise<void> {
    if (this.mockMode) {
      this.logger.info('Mock database disconnected');
      this.isConnected = false;
      return;
    }

    try {
      if (this.pool) {
        await this.pool.end();
        this.isConnected = false;
        this.logger.info('Successfully disconnected from database');
      }
    } catch (error) {
      this.logger.error('Failed to disconnect from database', error as Error);
    }
  }

  async checkConnection(): Promise<boolean> {
    if (this.mockMode) {
      return true;
    }

    try {
      if (!this.pool) return false;

      const client = await this.pool.connect();
      client.release();
      return true;
    } catch (error) {
      return false;
    }
  }

  async query(text: string, params?: any[]): Promise<QueryResult> {
    if (this.mockMode) {
      return this.mockQuery(text, params);
    }

    try {
      if (!this.pool) throw new Error('Database not connected');
      return await this.pool.query(text, params);
    } catch (error) {
      this.logger.error(`Query error: ${text}`, error as Error);
      throw error;
    }
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    if (this.mockMode) {
      return callback({
        query: async (text: string, params?: any[]) => this.mockQuery(text, params),
        release: () => {},
      } as unknown as PoolClient);
    }

    if (!this.pool) throw new Error('Database not connected');

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

  isMockMode(): boolean {
    return this.mockMode;
  }

  private async mockQuery(text: string, params?: any[]): Promise<QueryResult> {
    this.logger.info(`Mock query: ${text}`, { params });

    const result: QueryResult = {
      rows: [],
      rowCount: 0,
      command: '',
      oid: 0,
      fields: [],
    };

    if (text.toLowerCase().includes('select')) {
      if (text.toLowerCase().includes('from users')) {
        if (text.toLowerCase().includes('where email =') && params?.length) {
          const email = params[0];
          result.rows = this.mockData.users.filter((user) => user.email === email);
        } else {
          result.rows = [...this.mockData.users];
        }
      }
    }

    result.rowCount = result.rows.length;
    return result;
  }

  private validateConfig(config: DatabaseConfig): boolean {
    return !!(config && config.host && config.user && config.password && config.database);
  }

  // Add the missing methods
  async findUserByEmail(email: string) {
    const result = await this.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  }

  async createUser(userData: { email: string; password: string; fullName: string }) {
    const result = await this.query(
      `INSERT INTO users (email, password_hash, full_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, full_name`,
      [userData.email, userData.password, userData.fullName]
    );
    return result.rows[0];
  }

  async verifyEmail(token: string) {
    const result = await this.query(
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
}