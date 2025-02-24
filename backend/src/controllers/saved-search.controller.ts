import { Request, Response } from 'express';
import { SavedSearchService } from '../services/search/saved-search.service';
import { Logger } from '../services/logger';
import { AuthenticatedRequest } from '../types/auth.types';
import { 
  CreateSavedSearchDTO, 
  UpdateSavedSearchDTO, 
  SavedSearchQueryOptions 
} from '@thinkleap/shared/types/saved-search';

export class SavedSearchController {
  constructor(
    private readonly savedSearchService: SavedSearchService,
    private readonly logger: Logger
  ) {}

  
  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.userId; // From auth middleware
      const data: CreateSavedSearchDTO = {
        name: req.body.name,
        description: req.body.description,
        query: req.body.query,
        filters: req.body.filters || {}
      };

      const savedSearch = await this.savedSearchService.create(userId, data);
      
      res.status(201).json({
        status: 'success',
        data: savedSearch
      });
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      this.logger.error('Failed to create saved search', error, { userId: (req as AuthenticatedRequest).user.userId });
      res.status(500).json({
        status: 'error',
        message: 'Failed to create saved search'
      });
    }
  };

  findAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.userId;
      
      // Map API sort params to database columns
      const sortByMap: Record<string, SavedSearchQueryOptions['sortBy']> = {
        'created_at': 'createdAt',
        'name': 'name',
        'last_executed_at': 'lastExecutedAt',
        'execution_count': 'executionCount'
      };
  
      const sortBy = sortByMap[req.query.sortBy as string] || 'createdAt';
  
      const options: SavedSearchQueryOptions = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sortBy,
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc'
      };
  
      const { searches, total } = await this.savedSearchService.findByUser(userId, options);
      
      res.json({
        status: 'success',
        data: searches,
        pagination: {
          page: options.page,
          limit: options.limit,
          total
        }
      });
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      this.logger.error('Failed to fetch saved searches', error, { 
        userId: (req as AuthenticatedRequest).user.userId 
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch saved searches'
      });
    }
  };

   findOne = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = (req as AuthenticatedRequest).user.userId;

      const savedSearch = await this.savedSearchService.findById(id, userId);
      
      if (!savedSearch) {
        res.status(404).json({
          status: 'error',
          message: 'Saved search not found'
        });
        return;
      }

      res.json({
        status: 'success',
        data: savedSearch
      });
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      this.logger.error('Failed to fetch saved search', error, { 
        userId: (req as AuthenticatedRequest).user.userId,
        searchId: req.params.id 
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch saved search'
      });
    }
  };

   update = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = (req as AuthenticatedRequest).user.userId;
      const data: UpdateSavedSearchDTO = {
        name: req.body.name,
        description: req.body.description,
        filters: req.body.filters
      };

      const savedSearch = await this.savedSearchService.update(id, userId, data);
      
      res.json({
        status: 'success',
        data: savedSearch
      });
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      this.logger.error('Failed to update saved search', error, {
        userId: (req as AuthenticatedRequest).user.userId,
        searchId: req.params.id
      });
      
      if (error.message === 'Saved search not found') {
        res.status(404).json({
          status: 'error',
          message: 'Saved search not found'
        });
        return;
      }

      res.status(500).json({
        status: 'error',
        message: 'Failed to update saved search'
      });
    }
  };

   delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = (req as AuthenticatedRequest).user.userId;

      await this.savedSearchService.delete(id, userId);
      
      res.status(204).send();
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      this.logger.error('Failed to delete saved search', error, {
        userId: (req as AuthenticatedRequest).user.userId,
        searchId: req.params.id
      });

      if (error.message === 'Saved search not found') {
        res.status(404).json({
          status: 'error',
          message: 'Saved search not found'
        });
        return;
      }

      res.status(500).json({
        status: 'error',
        message: 'Failed to delete saved search'
      });
    }
  };

   execute = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = (req as AuthenticatedRequest).user.userId;

      const results = await this.savedSearchService.execute(id, userId);
      
      res.json({
        status: 'success',
        data: results
      });
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      this.logger.error('Failed to execute saved search', error, {
        userId: (req as AuthenticatedRequest).user.userId,
        searchId: req.params.id
      });

      if (error.message === 'Saved search not found') {
        res.status(404).json({
          status: 'error',
          message: 'Saved search not found'
        });
        return;
      }

      res.status(500).json({
        status: 'error',
        message: 'Failed to execute saved search'
      });
    }
  };
}