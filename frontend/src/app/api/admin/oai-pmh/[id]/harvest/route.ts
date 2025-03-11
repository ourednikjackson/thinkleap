import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../lib/db';
import { logger } from '../../../../../../lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../../lib/auth';
import axios from 'axios';

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
 * POST - Trigger a harvest for a source
 */
export async function POST(
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

    // Parse request body
    const body = await request.json();
    const harvestMode = body.mode || 'incremental'; // 'incremental' or 'full'

    // Get backend URL from environment variable or use default
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    
    // Call the backend API to trigger the harvest
    const response = await axios.post(`${backendUrl}/api/oai-pmh/harvest`, {
      sourceId: id,
      mode: harvestMode
    });

    // Return the result
    return NextResponse.json({ 
      success: true,
      message: `${harvestMode} harvest triggered for source ${source.name}`,
      data: response.data
    });
  } catch (error) {
    logger.error(`Error triggering harvest for source ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to trigger harvest' },
      { status: 500 }
    );
  }
}
