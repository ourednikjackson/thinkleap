// API route for managing OAI-PMH sources
import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../lib/db';
import { logger } from '../../../../../lib/logger';

// Retrieve all OAI-PMH sources
export async function GET(request: NextRequest) {
  try {
    const sources = await db('oai_pmh_sources')
      .select('*')
      .orderBy('created_at', 'desc');
    
    return NextResponse.json(sources);
  } catch (error) {
    logger.error('Error fetching OAI-PMH sources:', error);
    return NextResponse.json(
      { message: 'Error fetching OAI-PMH sources', error: String(error) },
      { status: 500 }
    );
  }
}

// Create a new OAI-PMH source
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.oai_endpoint || !body.metadata_prefix) {
      return NextResponse.json(
        { message: 'Name, OAI endpoint, and metadata prefix are required' },
        { status: 400 }
      );
    }
    
    // Create source
    const [source] = await db('oai_pmh_sources')
      .insert({
        name: body.name,
        oai_endpoint: body.oai_endpoint,
        metadata_prefix: body.metadata_prefix,
        set_spec: body.set_spec || null,
        harvest_interval_hours: body.harvest_interval_hours || 24,
        is_active: body.is_active !== undefined ? body.is_active : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .returning('*');
    
    return NextResponse.json(source, { status: 201 });
  } catch (error) {
    logger.error('Error creating OAI-PMH source:', error);
    return NextResponse.json(
      { message: 'Error creating OAI-PMH source', error: String(error) },
      { status: 500 }
    );
  }
}
