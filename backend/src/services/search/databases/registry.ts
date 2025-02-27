// backend/src/services/search/databases/registry.ts
import { Logger } from '../../../services/logger/types';
import { ConsoleLoggerAdapter } from '../../../services/logger/console-adapter';
import { BaseDatabaseConnector } from './base.connector';

export class DatabaseRegistry {
  private connectors: Map<string, BaseDatabaseConnector>;
  private logger: Logger;
  
  constructor(logger?: Logger) {
    this.connectors = new Map();
    // Use the adapter instead of console directly
    this.logger = logger || new ConsoleLoggerAdapter();
  }
  
  /**
   * Register a database connector
   */
  registerDatabase(id: string, connector: BaseDatabaseConnector): void {
    if (this.connectors.has(id)) {
      this.logger.warn(`Overwriting existing database connector: ${id}`);
    }
    this.connectors.set(id, connector);
    this.logger.info(`Registered database connector: ${id}`);
  }
  
  /**
   * Unregister a database connector
   */
  unregisterDatabase(id: string): boolean {
    const removed = this.connectors.delete(id);
    if (removed) {
      this.logger.info(`Unregistered database connector: ${id}`);
    }
    return removed;
  }
  
  /**
   * Get a specific database connector
   */
  getDatabase(id: string): BaseDatabaseConnector | undefined {
    return this.connectors.get(id);
  }
  
  /**
   * Get all registered database connectors
   */
  getAllDatabases(): BaseDatabaseConnector[] {
    return Array.from(this.connectors.values());
  }
  
  /**
   * Get all enabled database connectors that the user has access to
   */
  async getEnabledDatabases(userId: string): Promise<BaseDatabaseConnector[]> {
    const enabledDatabases: BaseDatabaseConnector[] = [];
    for (const connector of this.connectors.values()) {
      try {
        const [enabled, hasAccess] = await Promise.all([
          connector.isEnabled(),
          connector.validateAccess(userId)
        ]);
        if (enabled && hasAccess) {
          enabledDatabases.push(connector);
        }
      } catch (error) {
        this.logger.error(
          `Error checking database access for ${connector.name}`,
          error as Error
        );
      }
    }
    return enabledDatabases;
  }
  
  /**
   * Clear all registered connectors
   */
  clear(): void {
    this.connectors.clear();
    this.logger.info('Cleared all database connectors');
  }
}