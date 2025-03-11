import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../lib/db';
import { logger } from '../../../../../lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';

/**
 * Check if the current user has admin access
 */
async function checkAdminAccess() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || session.user.role !== 'admin') {
    return false;
  }
  return true;
}

/**
 * GET - Get a single OAI-PMH source by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check permissions
    const hasAccess = await checkAdminAccess();
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const id = params.id;
    const source = await db('oai_pmh_sources').where({ id }).first();

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    return NextResponse.json({ data: source });
  } catch (error) {
    logger.error(`Error fetching OAI-PMH source ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch OAI-PMH source' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update an OAI-PMH source
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check permissions
    const hasAccess = await checkAdminAccess();
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const id = params.id;
    const body = await request.json();

    // Check if source exists
    const source = await db('oai_pmh_sources').where({ id }).first();
    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Update fields
    const updateData: Record<string, any> = {
      name: body.name,
      oai_endpoint: body.oai_endpoint,
      metadata_prefix: body.metadata_prefix,
      set_spec: body.set_spec,
      filter_providers: body.filter_providers,
      status: body.status,
      harvest_frequency: body.harvest_frequency,
      updated_at: new Date()
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    await db('oai_pmh_sources').where({ id }).update(updateData);

    // Fetch updated source
    const updatedSource = await db('oai_pmh_sources').where({ id }).first();

    return NextResponse.json({ data: updatedSource });
  } catch (error) {
    logger.error(`Error updating OAI-PMH source ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to update OAI-PMH source' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete an OAI-PMH source
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check permissions
    const hasAccess = await checkAdminAccess();
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const id = params.id;

    // Check if source exists
    const source = await db('oai_pmh_sources').where({ id }).first();
    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Delete the source
    await db('oai_pmh_sources').where({ id }).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(`Error deleting OAI-PMH source ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to delete OAI-PMH source' },
      { status: 500 }
    );
  }
}
