import { Request, Response } from 'express';
import { UserPreferencesService } from '../services/user/preferences.service';
import { Logger } from '../services/logger';
import { AuthenticatedRequest } from '../types/auth.types';

export class PreferencesController {
  constructor(
    private readonly preferencesService: UserPreferencesService,
    private readonly logger: Logger
  ) {}

  getPreferences = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.userId;
      const preferences = await this.preferencesService.getPreferences(userId);
      
      res.json({
        status: 'success',
        data: preferences
      });
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      this.logger.error('Failed to get preferences', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get preferences'
      });
    }
  };

  updatePreferences = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.userId;
      const { path, value } = req.body;

      const preferences = await this.preferencesService.updatePreferences(
        userId,
        path,
        value
      );
      
      res.json({
        status: 'success',
        data: preferences
      });
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      this.logger.error('Failed to update preferences', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update preferences'
      });
    }
  };

  resetPreferences = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.userId;
      const preferences = await this.preferencesService.resetPreferences(userId);
      
      res.json({
        status: 'success',
        data: preferences
      });
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      this.logger.error('Failed to reset preferences', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to reset preferences'
      });
    }
  };
}