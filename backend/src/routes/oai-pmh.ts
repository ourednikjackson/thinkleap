import express from 'express';
import { db } from '../db';
import { OaiPmhHarvester } from '../services/oai-pmh/harvester';
import { harvestScheduler } from '../services/oai-pmh/scheduler';
import { logger } from '../utils/logger';
import { requireAdmin } from '../middleware/auth';

const router = express.Router();

/**
 * GET /api/oai-pmh/sources
 * List all OAI-PMH sources
 */
router.get('/sources', requireAdmin, async (req, res) => {
  try {
    const sources = await db('oai_pmh_sources')
      .select('*')
      .orderBy('name');
    
    res.json({ sources });
  } catch (error) {
    logger.error('Error fetching OAI-PMH sources:', error);
    res.status(500).json({ error: 'Failed to fetch OAI-PMH sources' });
  }
  return;
});

/**
 * GET /api/oai-pmh/sources/:id
 * Get a single OAI-PMH source by ID
 */
router.get('/sources/:id', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const source = await db('oai_pmh_sources')
      .where({ id })
      .first();
    
    if (!source) {
      res.status(404).json({ error: 'Source not found' });
      return;
    }
    
    res.json({ source });
  } catch (error) {
    logger.error(`Error fetching OAI-PMH source ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch OAI-PMH source' });
  }
  return;
});

/**
 * POST /api/oai-pmh/sources
 * Create a new OAI-PMH source
 */
router.post('/sources', requireAdmin, async (req, res) => {
  try {
    const { 
      name, 
      oai_endpoint, 
      metadata_prefix,
      set_spec, 
      filter_providers, 
      status, 
      harvest_frequency 
    } = req.body;
    
    // Validate required fields
    if (!name || !oai_endpoint || !metadata_prefix) {
      res.status(400).json({ 
        error: 'Missing required fields: name, oai_endpoint, metadata_prefix' 
      });
      return;
    }
    
    // Insert new source
    const [id] = await db('oai_pmh_sources').insert({
      name,
      oai_endpoint,
      metadata_prefix,
      set_spec: set_spec || null,
      filter_providers: filter_providers || ['jstor'],
      status: status || 'inactive',
      harvest_frequency: harvest_frequency || '0 0 * * *', // Default: daily at midnight
      created_at: new Date(),
      updated_at: new Date()
    }).returning('id');
    
    // Schedule if active
    if (status === 'active') {
      const source = await db('oai_pmh_sources').where({ id }).first();
      harvestScheduler.scheduleSource(source);
    }
    
    // Return created source
    const createdSource = await db('oai_pmh_sources').where({ id }).first();
    res.status(201).json({ source: createdSource });
  } catch (error) {
    logger.error('Error creating OAI-PMH source:', error);
    res.status(500).json({ error: 'Failed to create OAI-PMH source' });
  }
});

/**
 * PUT /api/oai-pmh/sources/:id
 * Update an OAI-PMH source
 */
router.put('/sources/:id', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    
    // Check if source exists
    const sourceExists = await db('oai_pmh_sources').where({ id }).first();
    if (!sourceExists) {
      res.status(404).json({ error: 'Source not found' });
      return;
    }
    
    const { 
      name, 
      oai_endpoint, 
      metadata_prefix,
      set_spec, 
      filter_providers, 
      status, 
      harvest_frequency 
    } = req.body;
    
    // Update the source
    const updateData = {
      ...(name && { name }),
      ...(oai_endpoint && { oai_endpoint }),
      ...(metadata_prefix && { metadata_prefix }),
      ...(set_spec !== undefined && { set_spec }),
      ...(filter_providers && { filter_providers }),
      ...(status && { status }),
      ...(harvest_frequency && { harvest_frequency }),
      updated_at: new Date()
    };
    
    await db('oai_pmh_sources').where({ id }).update(updateData);
    
    // Update scheduler if status changed
    if (status) {
      if (status === 'active') {
        const source = await db('oai_pmh_sources').where({ id }).first();
        harvestScheduler.scheduleSource(source);
      } else {
        harvestScheduler.unscheduleSource(id);
      }
    }
    
    // Return updated source
    const updatedSource = await db('oai_pmh_sources').where({ id }).first();
    res.json({ source: updatedSource });
  } catch (error) {
    logger.error(`Error updating OAI-PMH source ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update OAI-PMH source' });
  }
});

/**
 * DELETE /api/oai-pmh/sources/:id
 * Delete an OAI-PMH source
 */
router.delete('/sources/:id', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    
    // Check if source exists
    const sourceExists = await db('oai_pmh_sources').where({ id }).first();
    if (!sourceExists) {
      res.status(404).json({ error: 'Source not found' });
      return;
    }
    
    // Unschedule first
    harvestScheduler.unscheduleSource(id);
    
    // Delete the source
    await db('oai_pmh_sources').where({ id }).delete();
    
    res.json({ success: true });
  } catch (error) {
    logger.error(`Error deleting OAI-PMH source ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete OAI-PMH source' });
  }
});

/**
 * POST /api/oai-pmh/harvest
 * Trigger a harvest for a source
 */
router.post('/harvest', requireAdmin, async (req, res) => {
  try {
    const { sourceId, mode = 'incremental' } = req.body;
    
    if (!sourceId) {
      res.status(400).json({ error: 'Source ID is required' });
      return;
    }
    
    // Get the source
    const source = await db('oai_pmh_sources').where({ id: sourceId }).first();
    if (!source) {
      res.status(404).json({ error: 'Source not found' });
      return;
    }
    
    // Create harvester
    const harvester = new OaiPmhHarvester(source);
    
    // Start harvest (non-blocking)
    logger.info(`Triggered ${mode} harvest for source ${source.name} (${sourceId})`);
    
    // Set source to harvesting status
    await db('oai_pmh_sources')
      .where({ id: sourceId })
      .update({ 
        status: 'harvesting',
        updated_at: new Date()
      });
    
    // Start harvest in background
    if (mode === 'full') {
      harvester.harvestAll().then(async () => {
        // Update source status when complete
        await db('oai_pmh_sources')
          .where({ id: sourceId })
          .update({ 
            status: 'active',
            last_harvested: new Date(),
            updated_at: new Date()
          });
      }).catch(async (error) => {
        logger.error(`Harvest failed for source ${sourceId}:`, error);
        
        // Update source status when failed
        await db('oai_pmh_sources')
          .where({ id: sourceId })
          .update({ 
            status: 'error',
            updated_at: new Date()
          });
      });
    } else {
      harvester.incrementalHarvest().then(async () => {
        // Update source status when complete
        await db('oai_pmh_sources')
          .where({ id: sourceId })
          .update({ 
            status: 'active',
            last_harvested: new Date(),
            updated_at: new Date()
          });
      }).catch(async (error) => {
        logger.error(`Harvest failed for source ${sourceId}:`, error);
        
        // Update source status when failed
        await db('oai_pmh_sources')
          .where({ id: sourceId })
          .update({ 
            status: 'error',
            updated_at: new Date()
          });
      });
    }
    
    res.json({ 
      success: true, 
      message: `${mode} harvest started for source ${source.name}` 
    });
  } catch (error) {
    logger.error('Error triggering harvest:', error);
    res.status(500).json({ error: 'Failed to trigger harvest' });
  }
});

/**
 * GET /api/oai-pmh/logs
 * Get harvest logs
 */
router.get('/logs', requireAdmin, async (req, res) => {
  try {
    const { sourceId, status, limit = 50 } = req.query;
    
    let query = db('harvest_logs')
      .select([
        'harvest_logs.*',
        'oai_pmh_sources.name as source_name'
      ])
      .leftJoin('oai_pmh_sources', 'harvest_logs.source_id', 'oai_pmh_sources.id')
      .orderBy('harvest_logs.started_at', 'desc')
      .limit(Number(limit));
    
    // Apply filters if provided
    if (sourceId) {
      query = query.where('harvest_logs.source_id', sourceId);
    }
    
    if (status) {
      query = query.where('harvest_logs.status', status);
    }
    
    const logs = await query;
    
    res.json({ logs });
  } catch (error) {
    logger.error('Error fetching harvest logs:', error);
    res.status(500).json({ error: 'Failed to fetch harvest logs' });
  }
});

export default router;
