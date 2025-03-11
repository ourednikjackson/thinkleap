// API route for retrieving OAI-PMH harvest logs
import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../lib/db';
import { logger } from '../../../../../lib/logger';

// Retrieve harvest logs, with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get('sourceId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    // Build the query
    let query = db('oai_pmh_harvest_logs')
      .select([
        'oai_pmh_harvest_logs.*',
        'oai_pmh_sources.name as source_name'
      ])
      .leftJoin('oai_pmh_sources', 'oai_pmh_harvest_logs.source_id', 'oai_pmh_sources.id')
      .orderBy('oai_pmh_harvest_logs.start_time', 'desc')
      .limit(limit);
    
    // Apply filters if provided
    if (sourceId) {
      query = query.where('oai_pmh_harvest_logs.source_id', parseInt(sourceId));
    }
    
    if (status) {
      query = query.where('oai_pmh_harvest_logs.status', status);
    }
    
    const logs = await query;
    
    return NextResponse.json(logs);
  } catch (error) {
    logger.error('Error fetching OAI-PMH harvest logs:', error);
    return NextResponse.json(
      { message: 'Error fetching OAI-PMH harvest logs', error: String(error) },
      { status: 500 }
    );
  }
}
