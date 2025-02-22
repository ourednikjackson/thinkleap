import { Request, Response } from 'express';
import { SearchService } from '../services/search/search.service';
import { SearchQuery } from '@thinkleap/shared/types/search';
import { Logger } from '../services/logger';

export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly logger: Logger
  ) {}

  async search(req: Request, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
          }
      // Validate and parse query parameters
      const filters = req.query.filters ? JSON.parse(req.query.filters as string) : undefined;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(
        Math.max(1, parseInt(req.query.limit as string) || 20),
        100 // Maximum results per page
      );

      const query: SearchQuery = {
        term: req.query.q as string,
        filters,
        pagination: { page, limit }
      };

      // Validate search term
      if (!query.term || query.term.trim().length === 0) {
        res.status(400).json({
          error: 'Search term is required'
        });
        return;
      }

      // Parse databases parameter
      const databases = req.query.databases
        ? (req.query.databases as string).split(',')
        : undefined;

      // Get user ID from auth middleware
      const userId = req.user.userId;

      this.logger.debug('Processing search request', {
        userId,
        query: query.term,
        page,
        limit,
        databases
      });

      const results = await this.searchService.search(
        userId,
        query,
        databases
      );

      res.json(results);
    } catch (error) {
      this.logger.error('Search request failed', error as Error);

      if (error instanceof SyntaxError) {
        res.status(400).json({
          error: 'Invalid filter format'
        });
        return;
      }

      if (error instanceof Error && error.message === 'No enabled databases available for search') {
        res.status(400).json({
          error: 'No databases available for search'
        });
        return;
      }

      res.status(500).json({
        error: 'An error occurred while processing your search'
      });
    }
  };
}