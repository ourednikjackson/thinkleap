// API route for OAI-PMH harvest metrics
import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../lib/db';
import { logger } from '../../../../../lib/logger';

// Get OAI-PMH harvest metrics
export async function GET(request: NextRequest) {
  try {
    // Get total sources count
    const [{ total_sources }] = await db('oai_pmh_sources')
      .count('* as total_sources')
      .first();
    
    // Get active sources count
    const [{ active_sources }] = await db('oai_pmh_sources')
      .where('status', 'active')
      .count('* as active_sources')
      .first();
    
    // Get sources by status
    const sourcesByStatus = await db('oai_pmh_sources')
      .select('status')
      .count('* as count')
      .groupBy('status');
    
    // Format sources by status
    const sources_by_status = {
      active: 0,
      inactive: 0,
      harvesting: 0,
      error: 0
    };
    
    sourcesByStatus.forEach(item => {
      sources_by_status[item.status as keyof typeof sources_by_status] = Number(item.count);
    });
    
    // Get total records count
    const [{ total_records }] = await db('harvested_metadata')
      .count('* as total_records')
      .first();
    
    // Get last harvest time
    const lastHarvest = await db('harvest_logs')
      .select('end_time')
      .where('status', 'completed')
      .orderBy('end_time', 'desc')
      .first();
    
    // Prepare response
    const metrics = {
      total_sources: Number(total_sources),
      active_sources: Number(active_sources),
      total_records: Number(total_records),
      last_harvest_time: lastHarvest?.end_time,
      sources_by_status
    };
    
    return NextResponse.json(metrics);
  } catch (error) {
    logger.error('Error fetching OAI-PMH metrics:', error);
    return NextResponse.json(
      { message: 'Error fetching OAI-PMH metrics', error: String(error) },
      { status: 500 }
    );
  }
}
