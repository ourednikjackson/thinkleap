import { Request, Response, NextFunction } from 'express';
import { MetadataSearchService, MetadataSearchOptions } from '../services/search/metadata-search.service';
import { OaiPmhService } from '../services/harvesting/oai-pmh.service';
import { AuthenticatedRequest } from '../types/auth.types';
import { CustomError } from '../errors/customError';
import { LoggerService } from '../services/logger/logger.service';

export class MetadataController {
  constructor(
    private metadataSearchService: MetadataSearchService,
    private oaiPmhService: OaiPmhService,
    private logger: LoggerService
  ) {}

  /**
   * Search metadata records
   */
  async search(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { 
        query, 
        page = '1', 
        limit = '20',
        startDate,
        endDate,
        providers,
        openAccessOnly,
        sortBy,
        sortOrder
      } = req.query;

      // Build search options
      const searchOptions: MetadataSearchOptions = {
        query: query as string || '',
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10)
      };

      // Add institution ID from session if available
      if (req.session?.institutionId) {
        searchOptions.institutionId = req.session.institutionId;
      }

      // Add date range if provided
      if (startDate || endDate) {
        searchOptions.dateRange = {};
        if (startDate) {
          searchOptions.dateRange.from = new Date(startDate as string);
        }
        if (endDate) {
          searchOptions.dateRange.to = new Date(endDate as string);
        }
      }

      // Add providers filter if provided
      if (providers) {
        searchOptions.providers = Array.isArray(providers) 
          ? providers as string[] 
          : [providers as string];
      }

      // Add open access filter if provided
      if (openAccessOnly === 'true') {
        searchOptions.openAccessOnly = true;
      }

      // Add sorting options if provided
      if (sortBy) {
        searchOptions.sortBy = sortBy as 'relevance' | 'date' | 'title';
      }
      if (sortOrder) {
        searchOptions.sortOrder = sortOrder as 'asc' | 'desc';
      }

      // Perform search
      const results = await this.metadataSearchService.search(searchOptions);

      res.json(results);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get metadata record details
   */
  async getRecord(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        throw new CustomError('VALIDATION_ERROR', 'Record ID is required');
      }

      // Check access first
      const hasAccess = await this.metadataSearchService.checkAccess(req.user.userId, id);
      
      if (!hasAccess) {
        throw new CustomError('FORBIDDEN', 'You do not have access to this record');
      }

      // Get record from DB
      const record = await this.metadataSearchService.metadataById(id);
      
      if (!record) {
        throw new CustomError('NOT_FOUND', 'Record not found');
      }

      // Log access
      await this.metadataSearchService.logAccess(
        req.user.userId,
        id,
        'view',
        req.session?.institutionId
      );

      res.json(record);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Log access to a metadata record (for tracking)
   */
  async logAccess(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { accessType = 'view' } = req.body;

      if (!id) {
        throw new CustomError('VALIDATION_ERROR', 'Record ID is required');
      }

      // Validate access type
      if (!['view', 'download', 'citation', 'link'].includes(accessType)) {
        throw new CustomError('VALIDATION_ERROR', 'Invalid access type');
      }

      // Log the access
      await this.metadataSearchService.logAccess(
        req.user.userId,
        id,
        accessType as 'view' | 'download' | 'citation' | 'link',
        req.session?.institutionId
      );

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get available providers
   */
  async getProviders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Get institution ID from session if available
      const institutionId = req.session?.institutionId;

      // Get all providers
      const providers = await this.metadataSearchService.getProviders(institutionId);

      res.json({ providers });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Trigger harvesting of a specific source (admin only)
   */
  async triggerHarvest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sourceId } = req.params;

      if (!sourceId) {
        throw new CustomError('VALIDATION_ERROR', 'Source ID is required');
      }

      // TODO: Add admin check here

      // Trigger harvesting
      await this.oaiPmhService.harvestMetadata(sourceId);

      res.json({ 
        success: true,
        message: 'Harvesting initiated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Seed initial metadata from Crossref (admin only)
   */
  async seedInitialMetadata(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { institutionId, provider, limit } = req.body;

      if (!institutionId || !provider) {
        throw new CustomError('VALIDATION_ERROR', 'Institution ID and provider are required');
      }

      // TODO: Add admin check here

      // Seed metadata
      await this.oaiPmhService.seedInitialMetadata(
        institutionId,
        provider,
        limit ? parseInt(limit, 10) : 1000
      );

      res.json({
        success: true,
        message: 'Initial metadata seeding initiated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}