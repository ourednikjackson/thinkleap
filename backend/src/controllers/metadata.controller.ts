import { Request, Response, NextFunction } from 'express';
import { OaiPmhService } from '../services/metadata/oai-pmh.service';
import { DatabaseService } from '../services/database/database.service';
import { Logger } from '../services/logger';
import { CustomError } from '../errors/customError';
import { v4 as uuidv4 } from 'uuid';

export class MetadataController {
  constructor(
    private readonly oaiPmhService: OaiPmhService,
    private readonly databaseService: DatabaseService,
    private readonly logger: Logger
  ) {}

  /**
   * Trigger metadata harvesting for a specific client
   */
  async harvestClientMetadata(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      const { clientId } = req.params;
      const { fromDate, untilDate, metadataPrefix, set } = req.query;
      
      if (!clientId) {
        throw new CustomError('VALIDATION_ERROR', 'Client ID is required');
      }
      
      // Convert date strings to Date objects if provided
      const options: any = {};
      
      if (fromDate && typeof fromDate === 'string') {
        options.fromDate = new Date(fromDate);
      }
      
      if (untilDate && typeof untilDate === 'string') {
        options.untilDate = new Date(untilDate);
      }
      
      if (metadataPrefix && typeof metadataPrefix === 'string') {
        options.metadataPrefix = metadataPrefix;
      }
      
      if (set && typeof set === 'string') {
        options.set = set;
      }
      
      // Start harvesting asynchronously
      this.oaiPmhService.harvestFromClient(clientId, options)
        .then(result => {
          this.logger.info(`Harvesting completed for client ${clientId}`, {
            recordsHarvested: result.recordsHarvested,
            recordsUpdated: result.recordsUpdated,
            recordsFailed: result.recordsFailed
          });
        })
        .catch(error => {
          this.logger.error(`Harvesting failed for client ${clientId}`, error as Error);
        });
      
      // Respond immediately with job started message
      res.status(202).json({
        message: 'Harvesting job started',
        clientId,
        options
      });
    } catch (error) {
      this.logger.error('Error starting metadata harvest', error as Error);
      next(error);
    }
  }

  /**
   * Get harvesting logs for a client
   */
  async getHarvestingLogs(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      const { clientId } = req.params;
      const { page = '1', limit = '20' } = req.query;
      
      if (!clientId) {
        throw new CustomError('VALIDATION_ERROR', 'Client ID is required');
      }
      
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      
      // Query harvesting logs
      const result = await this.databaseService.query(
        `SELECT * FROM harvesting_logs
         WHERE client_id = $1
         ORDER BY started_at DESC
         LIMIT $2 OFFSET $3`,
        [clientId, limitNum, (pageNum - 1) * limitNum]
      );
      
      // Get total count
      const countResult = await this.databaseService.query(
        'SELECT COUNT(*) FROM harvesting_logs WHERE client_id = $1',
        [clientId]
      );
      
      const totalLogs = parseInt(countResult.rows[0].count, 10);
      
      res.json({
        logs: result.rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalLogs,
          pages: Math.ceil(totalLogs / limitNum)
        }
      });
    } catch (error) {
      this.logger.error('Error retrieving harvesting logs', error as Error);
      next(error);
    }
  }

  /**
   * Search for metadata across all sources
   */
  async searchMetadata(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      const { query } = req.query;
      const { page = '1', limit = '20', providerFilter } = req.query;
      
      if (!query || typeof query !== 'string') {
        throw new CustomError('VALIDATION_ERROR', 'Search query is required');
      }
      
      // Get authenticated user data with type safety
      const authUser = req.user as Express.User | undefined;
      const userId = authUser?.userId || null;
      const clientId = authUser?.clientId || null;
      
      // Parse provider filter if provided
      let providers: string[] | undefined;
      if (providerFilter && typeof providerFilter === 'string') {
        providers = providerFilter.split(',');
      }
      
      // Search metadata
      const results = await this.databaseService.searchMetadata(query, {
        clientId,
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        providerFilter: providers
      });
      
      // Log access if user is authenticated
      if (req.user && req.user.userId) {
        const authUser = req.user as Express.User;
        await this.databaseService.logUserAccess({
          id: uuidv4(),
          userId: authUser.userId,
          clientId: authUser.clientId || null,
          resourceUrl: null,
          resourceTitle: `Search: ${query}`
        });
      }
      
      res.json(results);
    } catch (error) {
      this.logger.error('Error searching metadata', error as Error);
      next(error);
    }
  }

  /**
   * Get metadata by ID
   */
  async getMetadataById(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      const { id } = req.params;
      
      if (!id) {
        throw new CustomError('VALIDATION_ERROR', 'Metadata ID is required');
      }
      
      // Query metadata
      const result = await this.databaseService.query(
        'SELECT * FROM metadata WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        throw new CustomError('NOT_FOUND', 'Metadata not found');
      }
      
      const metadata = result.rows[0];
      
      // Check if user has access to this metadata
      // Use proper casting for type safety
      const authUser = req.user as Express.User | undefined;
      const userId = authUser?.userId || null;
      const clientId = authUser?.clientId || null;
      
      if (clientId) {
        // Check if this is the client's own metadata or they have a subscription
        const hasAccess = metadata.client_id === clientId || this.checkSubscriptionAccess(clientId, metadata.source_provider);
        
        if (!hasAccess) {
          throw new CustomError('FORBIDDEN', 'You do not have access to this resource');
        }
      }
      
      // Log access if user is authenticated
      if (req.user && req.user.userId) {
        const authUser = req.user as Express.User;
        await this.databaseService.logUserAccess({
          id: uuidv4(),
          userId: authUser.userId,
          clientId: authUser.clientId || null,
          resourceUrl: metadata.url,
          resourceDoi: metadata.doi,
          resourceTitle: metadata.title
        });
      }
      
      res.json(metadata);
    } catch (error) {
      this.logger.error('Error retrieving metadata', error as Error);
      next(error);
    }
  }

  /**
   * Check if a client has subscription access to a provider
   */
  private async checkSubscriptionAccess(clientId: string, provider: string): Promise<boolean> {
    try {
      const client = await this.databaseService.getClientById(clientId);
      
      if (!client) {
        return false;
      }
      
      const subscriptions = client.subscriptions || {};
      const providers = subscriptions.providers || [];
      
      return providers.includes(provider);
    } catch (error) {
      this.logger.error('Error checking subscription access', error as Error);
      return false;
    }
  }
}
