// API route for managing a specific OAI-PMH source
import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../lib/db';
import { logger } from '../../../../../../lib/logger';

// Retrieve a specific OAI-PMH source
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { message: 'Invalid source ID' },
        { status: 400 }
      );
    }
    
    const source = await db('oai_pmh_sources')
      .where({ id })
      .first();
    
    if (!source) {
      return NextResponse.json(
        { message: 'OAI-PMH source not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(source);
  } catch (error) {
    logger.error(`Error fetching OAI-PMH source ${params.id}:`, error);
    return NextResponse.json(
      { message: 'Error fetching OAI-PMH source', error: String(error) },
      { status: 500 }
    );
  }
}

// Update a specific OAI-PMH source
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { message: 'Invalid source ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.oai_endpoint || !body.metadata_prefix) {
      return NextResponse.json(
        { message: 'Name, OAI endpoint, and metadata prefix are required' },
        { status: 400 }
      );
    }
    
    // Check if source exists
    const existingSource = await db('oai_pmh_sources')
      .where({ id })
      .first();
    
    if (!existingSource) {
      return NextResponse.json(
        { message: 'OAI-PMH source not found' },
        { status: 404 }
      );
    }
    
    // Update source
    const [updatedSource] = await db('oai_pmh_sources')
      .where({ id })
      .update({
        name: body.name,
        oai_endpoint: body.oai_endpoint,
        metadata_prefix: body.metadata_prefix,
        set_spec: body.set_spec || null,
        harvest_interval_hours: body.harvest_interval_hours || 24,
        is_active: body.is_active !== undefined ? body.is_active : true,
        updated_at: new Date().toISOString()
      })
      .returning('*');
    
    return NextResponse.json(updatedSource);
  } catch (error) {
    logger.error(`Error updating OAI-PMH source ${params.id}:`, error);
    return NextResponse.json(
      { message: 'Error updating OAI-PMH source', error: String(error) },
      { status: 500 }
    );
  }
}

// Delete a specific OAI-PMH source
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { message: 'Invalid source ID' },
        { status: 400 }
      );
    }
    
    // Check if source exists
    const existingSource = await db('oai_pmh_sources')
      .where({ id })
      .first();
    
    if (!existingSource) {
      return NextResponse.json(
        { message: 'OAI-PMH source not found' },
        { status: 404 }
      );
    }
    
    // Delete associated harvest logs first
    await db('oai_pmh_harvest_logs')
      .where({ source_id: id })
      .delete();
    
    // Delete source
    await db('oai_pmh_sources')
      .where({ id })
      .delete();
    
    return NextResponse.json({ message: 'OAI-PMH source deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting OAI-PMH source ${params.id}:`, error);
    return NextResponse.json(
      { message: 'Error deleting OAI-PMH source', error: String(error) },
      { status: 500 }
    );
  }
}
