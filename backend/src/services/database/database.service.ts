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

  // User management methods
  async findUserByEmail(email: string) {
    const result = await this.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  }

  async getUserById(userId: string) {
    const result = await this.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0];
  }

  async createUserWithSaml(userData: any) {
    const userId = userData.id || crypto.randomUUID();
    const result = await this.query(
      `INSERT INTO users (id, email, password_hash, name) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [userId, userData.email, userData.password, userData.fullName]
    );
    return result.rows[0];
  }

  // Client management methods
  async getClients() {
    const result = await this.query('SELECT * FROM clients');
    return result.rows;
  }

  async getClientById(clientId: string) {
    const result = await this.query(
      'SELECT * FROM clients WHERE id = $1',
      [clientId]
    );
    return result.rows[0];
  }

  async getClientByDomain(domain: string) {
    const result = await this.query(
      'SELECT * FROM clients WHERE domain = $1',
      [domain]
    );
    return result.rows[0];
  }

  async createClient(clientData: any) {
    const clientId = clientData.id || crypto.randomUUID();
    const result = await this.query(
      `INSERT INTO clients 
       (id, name, domain, is_federated, idp_entity_id, idp_metadata, idp_certificate, oai_endpoint, subscriptions) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [
        clientId,
        clientData.name,
        clientData.domain,
        clientData.isFederated || false,
        clientData.idpEntityId,
        clientData.idpMetadata,
        clientData.idpCertificate,
        clientData.oaiEndpoint,
        JSON.stringify(clientData.subscriptions || {})
      ]
    );
    return result.rows[0];
  }

  async updateClient(clientId: string, clientData: any) {
    const result = await this.query(
      `UPDATE clients 
       SET name = $2, domain = $3, is_federated = $4, idp_entity_id = $5, 
           idp_metadata = $6, idp_certificate = $7, oai_endpoint = $8, 
           subscriptions = $9, updated_at = NOW() 
       WHERE id = $1 
       RETURNING *`,
      [
        clientId,
        clientData.name,
        clientData.domain,
        clientData.isFederated || false,
        clientData.idpEntityId,
        clientData.idpMetadata,
        clientData.idpCertificate,
        clientData.oaiEndpoint,
        JSON.stringify(clientData.subscriptions || {})
      ]
    );
    return result.rows[0];
  }

  async getClientsWithOaiEndpoint() {
    const result = await this.query(
      'SELECT * FROM clients WHERE oai_endpoint IS NOT NULL AND oai_endpoint != \'\''  
    );
    return result.rows;
  }

  // SAML session management
  async createSamlSession(sessionData: any) {
    const result = await this.query(
      `INSERT INTO saml_sessions 
       (id, user_id, client_id, session_index, expires_at) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [
        sessionData.id,
        sessionData.userId,
        sessionData.clientId,
        sessionData.sessionIndex,
        sessionData.expiresAt
      ]
    );
    return result.rows[0];
  }

  async getSamlSession(sessionId: string) {
    const result = await this.query(
      'SELECT * FROM saml_sessions WHERE id = $1',
      [sessionId]
    );
    return result.rows[0];
  }

  async deleteSamlSession(sessionId: string) {
    await this.query(
      'DELETE FROM saml_sessions WHERE id = $1',
      [sessionId]
    );
    return true;
  }

  // Metadata harvesting methods
  async createHarvestingLog(logData: any) {
    const result = await this.query(
      `INSERT INTO harvesting_logs 
       (id, client_id, source_provider, harvest_type, started_at, 
        records_harvested, records_updated, records_failed) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [
        logData.id,
        logData.clientId,
        logData.sourceProvider,
        logData.harvestType,
        logData.startedAt,
        logData.recordsHarvested,
        logData.recordsUpdated,
        logData.recordsFailed
      ]
    );
    return result.rows[0];
  }

  async updateHarvestingLog(logId: string, logData: any) {
    const updates = [];
    const values = [logId];
    let paramIdx = 2;

    if (logData.completedAt) {
      updates.push(`completed_at = $${paramIdx}`);
      values.push(logData.completedAt);
      paramIdx++;
    }

    if (logData.recordsHarvested !== undefined) {
      updates.push(`records_harvested = $${paramIdx}`);
      values.push(logData.recordsHarvested);
      paramIdx++;
    }

    if (logData.recordsUpdated !== undefined) {
      updates.push(`records_updated = $${paramIdx}`);
      values.push(logData.recordsUpdated);
      paramIdx++;
    }

    if (logData.recordsFailed !== undefined) {
      updates.push(`records_failed = $${paramIdx}`);
      values.push(logData.recordsFailed);
      paramIdx++;
    }

    if (logData.errorMessage !== undefined) {
      updates.push(`error_message = $${paramIdx}`);
      values.push(logData.errorMessage);
      paramIdx++;
    }

    if (updates.length === 0) {
      return null;
    }

    const query = `UPDATE harvesting_logs SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING *`;
    const result = await this.query(query, values);
    return result.rows[0];
  }

  async getLastSuccessfulHarvest(clientId: string) {
    const result = await this.query(
      `SELECT * FROM harvesting_logs 
       WHERE client_id = $1 AND completed_at IS NOT NULL AND error_message IS NULL 
       ORDER BY completed_at DESC LIMIT 1`,
      [clientId]
    );
    return result.rows[0];
  }

  async batchInsertMetadata(records: any[]) {
    if (records.length === 0) return [];

    return this.transaction(async (client) => {
      const insertedRecords = [];
      
      for (const record of records) {
        // Check if record with this identifier already exists
        const existingResult = await client.query(
          'SELECT id FROM metadata WHERE identifier = $1 AND client_id = $2',
          [record.identifier, record.clientId]
        );

        if (existingResult.rows.length > 0) {
          // Update existing record
          const updateResult = await client.query(
            `UPDATE metadata SET 
             title = $3, abstract = $4, authors = $5, doi = $6, url = $7, 
             publication_date = $8, publisher = $9, keywords = $10, 
             source_provider = $11, additional_data = $12, updated_at = NOW() 
             WHERE identifier = $1 AND client_id = $2 
             RETURNING *`,
            [
              record.identifier,
              record.clientId,
              record.title,
              record.abstract || null,
              JSON.stringify(record.authors || []),
              record.doi || null,
              record.url || null,
              record.publicationDate || null,
              record.publisher || null,
              JSON.stringify(record.keywords || []),
              record.sourceProvider,
              JSON.stringify(record.additionalData || {})
            ]
          );
          insertedRecords.push(updateResult.rows[0]);
        } else {
          // Insert new record
          const insertResult = await client.query(
            `INSERT INTO metadata 
             (id, identifier, title, abstract, authors, doi, url, 
              publication_date, publisher, keywords, source_provider, 
              client_id, additional_data) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
             RETURNING *`,
            [
              record.id,
              record.identifier,
              record.title,
              record.abstract || null,
              JSON.stringify(record.authors || []),
              record.doi || null,
              record.url || null,
              record.publicationDate || null,
              record.publisher || null,
              JSON.stringify(record.keywords || []),
              record.sourceProvider,
              record.clientId,
              JSON.stringify(record.additionalData || {})
            ]
          );
          insertedRecords.push(insertResult.rows[0]);
        }
      }
      
      return insertedRecords;
    });
  }

  async searchMetadata(query: string, options: any = {}) {
    // Build search query with pagination, filtering by client subscriptions
    const { clientId, page = 1, limit = 20, providerFilter } = options;
    const offset = (page - 1) * limit;
    
    // Parameters for the query
    const params: any[] = [`%${query}%`];
    let clientFilter = '';
    
    if (clientId) {
      params.push(clientId);
      clientFilter = `AND (client_id = $${params.length} OR client_id IN 
                      (SELECT id FROM clients WHERE id = $${params.length} AND 
                       (subscriptions->>'providers')::jsonb ? source_provider))`;
    }
    
    let providerClause = '';
    if (providerFilter && providerFilter.length > 0) {
      providerClause = 'AND source_provider IN (' + 
        providerFilter.map((_: any, idx: number) => `$${params.length + idx + 1}`).join(',') + ')';
      params.push(...providerFilter);
    }
    
    const countQuery = `
      SELECT COUNT(*) 
      FROM metadata 
      WHERE (title ILIKE $1 OR abstract ILIKE $1) 
      ${clientFilter} 
      ${providerClause}
    `;
    
    const dataQuery = `
      SELECT * 
      FROM metadata 
      WHERE (title ILIKE $1 OR abstract ILIKE $1) 
      ${clientFilter} 
      ${providerClause}
      ORDER BY publication_date DESC 
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    const [countResult, dataResult] = await Promise.all([
      this.query(countQuery, params),
      this.query(dataQuery, params)
    ]);
    
    return {
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      results: dataResult.rows
    };
  }

  // User access tracking
  async logUserAccess(accessData: any) {
    const result = await this.query(
      `INSERT INTO user_access_logs 
       (id, user_id, client_id, resource_url, resource_doi, resource_title, accessed_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [
        accessData.id || crypto.randomUUID(),
        accessData.userId,
        accessData.clientId,
        accessData.resourceUrl,
        accessData.resourceDoi || null,
        accessData.resourceTitle || null,
        accessData.accessedAt || new Date()
      ]
    );
    return result.rows[0];
  }

  async createUser(userData: { email: string; password: string; fullName: string }) {
    // Generate a UUID directly in PostgreSQL
    const result = await this.query(
      `INSERT INTO users (id, email, password_hash, name)
       VALUES (gen_random_uuid(), $1, $2, $3)
       RETURNING id, email, name as "fullName"`,
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