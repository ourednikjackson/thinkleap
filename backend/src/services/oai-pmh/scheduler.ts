import cron from 'node-cron';
import { db } from '../../db';
import { logger } from '../../utils/logger';
import { OaiPmhHarvester } from './harvester';

export class HarvestScheduler {
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();
  private isRunning: boolean = false;

  /**
   * Initialize the scheduler and schedule all active sources
   */
  async initialize(): Promise<void> {
    this.isRunning = true;
    
    try {
      // Get all active sources
      const sources = await db('oai_pmh_sources')
        .where({ status: 'active' })
        .select();
      
      // Schedule each source
      for (const source of sources) {
        this.scheduleSource(source);
      }
      
      logger.info(`Harvest scheduler initialized with ${sources.length} active sources`);
    } catch (error) {
      logger.error('Failed to initialize harvest scheduler:', error);
      throw error;
    }
  }

  /**
   * Stop all scheduled tasks
   */
  stop(): void {
    for (const [sourceId, task] of this.scheduledTasks.entries()) {
      task.stop();
      logger.info(`Stopped scheduled harvest for source ${sourceId}`);
    }
    
    this.scheduledTasks.clear();
    this.isRunning = false;
    logger.info('Harvest scheduler stopped');
  }

  /**
   * Schedule harvesting for a single source
   */
  scheduleSource(source: any): void {
    // Stop existing task if there is one
    if (this.scheduledTasks.has(source.id)) {
      this.scheduledTasks.get(source.id)?.stop();
      this.scheduledTasks.delete(source.id);
    }
    
    try {
      // Validate cron expression
      if (!cron.validate(source.harvest_frequency)) {
        logger.error(`Invalid cron expression for source ${source.id}: ${source.harvest_frequency}`);
        return;
      }
      
      // Schedule new task
      const task = cron.schedule(source.harvest_frequency, async () => {
        await this.runHarvest(source);
      });
      
      this.scheduledTasks.set(source.id, task);
      logger.info(`Scheduled harvest for source ${source.name} (${source.id}) with cron: ${source.harvest_frequency}`);
    } catch (error) {
      logger.error(`Failed to schedule source ${source.id}:`, error);
    }
  }

  /**
   * Unschedule a source
   */
  unscheduleSource(sourceId: string): void {
    if (this.scheduledTasks.has(sourceId)) {
      this.scheduledTasks.get(sourceId)?.stop();
      this.scheduledTasks.delete(sourceId);
      logger.info(`Unscheduled harvest for source ${sourceId}`);
    }
  }

  /**
   * Run harvest for a single source
   */
  async runHarvest(source: any): Promise<void> {
    logger.info(`Starting scheduled harvest for source ${source.name} (${source.id})`);
    
    try {
      const harvester = new OaiPmhHarvester({
        id: source.id,
        name: source.name,
        oai_endpoint: source.oai_endpoint,
        metadata_prefix: source.metadata_prefix,
        filter_providers: source.filter_providers,
        status: source.status
      });
      
      // Run incremental harvest from the last harvest date
      await harvester.incrementalHarvest();
      
      logger.info(`Completed scheduled harvest for source ${source.name} (${source.id})`);
    } catch (error) {
      logger.error(`Failed scheduled harvest for source ${source.name} (${source.id}):`, error);
      
      // Update source status if there's a persistent error
      await db('oai_pmh_sources')
        .where({ id: source.id })
        .update({ 
          status: 'error',
          updated_at: new Date()
        });
    }
  }

  /**
   * Check for sources that need to be harvested manually
   * (e.g., missed scheduled runs or new sources)
   */
  async checkForDueHarvests(): Promise<void> {
    if (!this.isRunning) return;
    
    try {
      // Get sources that haven't been harvested recently
      const dueThreshold = new Date();
      dueThreshold.setDate(dueThreshold.getDate() - 7); // Consider sources not harvested in a week
      
      const dueSources = await db('oai_pmh_sources')
        .where({ status: 'active' })
        .where(function() {
          this.where('last_harvested', '<', dueThreshold)
            .orWhereNull('last_harvested');
        })
        .select();
      
      for (const source of dueSources) {
        // Don't run if another harvest is already in progress
        const runningHarvest = await db('harvest_logs')
          .where({ 
            source_id: source.id,
            status: 'running'
          })
          .first();
        
        if (!runningHarvest) {
          logger.info(`Source ${source.name} (${source.id}) due for harvest - running now`);
          await this.runHarvest(source);
        }
      }
    } catch (error) {
      logger.error('Error checking for due harvests:', error);
    }
  }

  /**
   * Re-schedule all sources (e.g., after config changes)
   */
  async rescheduleAll(): Promise<void> {
    // Stop all current tasks
    for (const [sourceId, task] of this.scheduledTasks.entries()) {
      task.stop();
      logger.info(`Stopped scheduled harvest for source ${sourceId}`);
    }
    
    this.scheduledTasks.clear();
    
    if (this.isRunning) {
      await this.initialize();
    }
  }

  /**
   * Run an immediate harvest for a source
   */
  async runImmediateHarvest(sourceId: string, full: boolean = false): Promise<void> {
    try {
      const source = await db('oai_pmh_sources')
        .where({ id: sourceId })
        .first();
      
      if (!source) {
        throw new Error(`Source not found: ${sourceId}`);
      }
      
      logger.info(`Running immediate ${full ? 'full' : 'incremental'} harvest for source ${source.name} (${source.id})`);
      
      const harvester = new OaiPmhHarvester({
        id: source.id,
        name: source.name,
        oai_endpoint: source.oai_endpoint,
        metadata_prefix: source.metadata_prefix,
        filter_providers: source.filter_providers,
        status: source.status
      });
      
      if (full) {
        await harvester.harvestAll();
      } else {
        await harvester.incrementalHarvest();
      }
      
      logger.info(`Completed immediate harvest for source ${source.name} (${source.id})`);
    } catch (error) {
      logger.error(`Failed immediate harvest:`, error);
      throw error;
    }
  }
}

// Create singleton instance
export const harvestScheduler = new HarvestScheduler();
