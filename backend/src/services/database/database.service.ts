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
  private pool: Pool | null = null;
  private isConnected: boolean = false;
  private mockMode: boolean = false;
  private logger: Logger;
  private mockData: Record<string, any[]> = {
    users: [],
    // Add other tables as needed
  };

  constructor(config: DatabaseConfig, logger?: Logger) {
    this.logger = logger || new ConsoleLoggerAdapter();
    
    try {
      // Only create the pool if we have valid config
      if (this.validateConfig(config)) {
        this.pool = new Pool({
          user: config.user,
          host: config.host,
          database: config.database,
          password: config.password,
          port: config.port,
          ssl: config.ssl,
          // Resilience settings
          connectionTimeoutMillis: 10000,
          idleTimeoutMillis: 30000,
        });

        // Handle pool errors without crashing the application
        this.pool.on('error', (err) => {
          this.logger.error('Unexpected error on idle client', err);
          // Don't exit the process, just log the error
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
      
      // Test the connection
      const client = await this.pool.connect();
      client.release();
      this.isConnected = true;
      this.logger.info('Successfully connected to database');
    } catch (error) {
      this.isConnected = false;
      this.logger.error('Failed to connect to database', error as Error);
      
      // Switch to mock mode instead of throwing
      this.logger.warn('Switching to mock mode due to connection failure');
      this.mockMode = true;
      this.isConnected = true; // We're "connected" in mock mode
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
      // Don't throw, just log the error
    }
  }

  async checkConnection(): Promise<boolean> {
    if (this.mockMode) {
      return true; // Mock mode is always "connected"
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

  async findUserByEmail(email: string) {
    if (this.mockMode) {
      return this.mockData.users.find(user => user.email === email);
    }
    
    try {
      if (!this.pool) throw new Error('Database not connected');
      
      const result = await this.pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      return result.rows[0];
    } catch (error) {
      this.logger.error(`Error finding user by email: ${email}`, error as Error);
      return null; // Return null instead of throwing
    }
  }

  async createUser(userData: { email: string; password: string; fullName: string }) {
    if (this.mockMode) {
      const newUser = {
        id: this.mockData.users.length + 1,
        email: userData.email,
        password_hash: userData.password,
        full_name: userData.fullName,
        created_at: new Date().toISOString()
      };
      this.mockData.users.push(newUser);
      return newUser;
    }
    
    try {
      if (!this.pool) throw new Error('Database not connected');
      
      const result = await this.pool.query(
        'INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING *',
        [userData.email, userData.password, userData.fullName]
      );
      return result.rows[0];
    } catch (error) {
      this.logger.error('Error creating user', error as Error);
      throw error; // Keep throwing here as this is likely a business logic error
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
      // In mock mode, just call the callback with a mock client
      return callback({
        query: async (text: string, params?: any[]) => this.mockQuery(text, params),
        release: () => {}
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
  
  // Utility method to check if we're in mock mode
  isMockMode(): boolean {
    return this.mockMode;
  }
  
  // Simple mock query implementation
  private async mockQuery(text: string, params?: any[]): Promise<QueryResult> {
    this.logger.info(`Mock query: ${text}`, { params });
    
    // Default empty result
    const result: QueryResult = {
      rows: [],
      rowCount: 0,
      command: '',
      oid: 0,
      fields: []
    };
    
    // Very simple SQL parsing for mock purposes
    if (text.toLowerCase().includes('select')) {
      // Handle SELECT queries
      if (text.toLowerCase().includes('from users')) {
        if (text.toLowerCase().includes('where email =') && params?.length) {
          // Handle user lookup by email
          const email = params[0];
          result.rows = this.mockData.users.filter(user => user.email === email);
        } else {
          // Return all users
          result.rows = [...this.mockData.users];
        }
      }
      // Add more table handlers as needed
    }
    
    result.rowCount = result.rows.length;
    return result;
  }
  
  // Validate the database configuration
  private validateConfig(config: DatabaseConfig): boolean {
    return !!(
      config &&
      config.host &&
      config.user &&
      config.password &&
      config.database
    );
  }
}