import { DatabaseService } from '../database/database.service';
import { Logger } from '../logger';
import { UserPreferences, DEFAULT_PREFERENCES } from '@thinkleap/shared/types/user-preferences';

export class UserPreferencesService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly logger: Logger
  ) {}

  async getPreferences(userId: string): Promise<UserPreferences> {
    try {
      const result = await this.databaseService.query(
        'SELECT preferences FROM users WHERE id = $1',
        [userId]
      );

      if (!result.rows[0]?.preferences) {
        return DEFAULT_PREFERENCES;
      }

      return {
        ...DEFAULT_PREFERENCES,
        ...result.rows[0].preferences
      };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      this.logger.error('Failed to get user preferences', error, { userId });
      throw error;
    }
  }

  async updatePreferences(
    userId: string,
    path: string[],
    value: unknown
  ): Promise<UserPreferences> {
    try {
      const currentPreferences = await this.getPreferences(userId);
      const updatedPreferences = this.updatePreferencesAtPath(
        currentPreferences,
        path,
        value
      );

      await this.databaseService.query(
        'UPDATE users SET preferences = $1 WHERE id = $2',
        [JSON.stringify(updatedPreferences), userId]
      );

      return updatedPreferences;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      this.logger.error('Failed to update user preferences', error, { userId, path, value });
      throw error;
    }
  }

  async resetPreferences(userId: string): Promise<UserPreferences> {
    try {
      await this.databaseService.query(
        'UPDATE users SET preferences = $1 WHERE id = $2',
        [JSON.stringify(DEFAULT_PREFERENCES), userId]
      );

      return DEFAULT_PREFERENCES;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      this.logger.error('Failed to reset user preferences', error, { userId });
      throw error;
    }
  }

  private updatePreferencesAtPath(
    preferences: UserPreferences,
    path: string[],
    value: unknown
  ): UserPreferences {
    const newPreferences = { ...preferences };
    let current: any = newPreferences;
    
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = value;
    return newPreferences;
  }
}