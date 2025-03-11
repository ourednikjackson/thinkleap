import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
import { logger } from '../../../../lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';

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
 * GET - List all OAI-PMH sources
 */
export async function GET(request: NextRequest) {
  try {
    // Check permissions
    const hasAccess = await checkAdminAccess();
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Build query
    let query = db.from('oai_pmh_sources').select('*');
    
    if (status) {
      query = query.where({ status });
    }

    // Get total count
    const countResult = await query.clone().count('* as total').first();
    const total = parseInt(countResult?.total || '0');

    // Get paginated results
    const sources = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      data: sources,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching OAI-PMH sources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch OAI-PMH sources' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new OAI-PMH source
 */
export async function POST(request: NextRequest) {
  try {
    // Check permissions
    const hasAccess = await checkAdminAccess();
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.oai_endpoint || !body.metadata_prefix) {
      return NextResponse.json(
        { error: 'Missing required fields: name, oai_endpoint, metadata_prefix' },
        { status: 400 }
      );
    }

    // Set defaults
    const source = {
      name: body.name,
      oai_endpoint: body.oai_endpoint,
      metadata_prefix: body.metadata_prefix,
      set_spec: body.set_spec || null,
      filter_providers: body.filter_providers || ['jstor'],
      status: body.status || 'inactive',
      harvest_frequency: body.harvest_frequency || '0 0 * * *', // Default: daily at midnight
      created_at: new Date(),
      updated_at: new Date()
    };

    // Insert new source
    const [id] = await db('oai_pmh_sources').insert(source).returning('id');
    
    // Return created source
    const createdSource = await db('oai_pmh_sources').where({ id }).first();
    
    return NextResponse.json({ data: createdSource }, { status: 201 });
  } catch (error) {
    logger.error('Error creating OAI-PMH source:', error);
    return NextResponse.json(
      { error: 'Failed to create OAI-PMH source' },
      { status: 500 }
    );
  }
}
