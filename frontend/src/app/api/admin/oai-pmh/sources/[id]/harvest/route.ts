// API route for triggering harvests for a specific OAI-PMH source
import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../../lib/db';
import { logger } from '../../../../../../../lib/logger';

// Trigger a harvest for a specific OAI-PMH source
export async function POST(
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
    const source = await db('oai_pmh_sources')
      .where({ id })
      .first();
    
    if (!source) {
      return NextResponse.json(
        { message: 'OAI-PMH source not found' },
        { status: 404 }
      );
    }
    
    // Create a harvest log entry
    const [harvestLog] = await db('oai_pmh_harvest_logs')
      .insert({
        source_id: id,
        start_time: new Date().toISOString(),
        status: 'running',
        records_processed: 0,
        records_added: 0,
        records_updated: 0,
        records_failed: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .returning('*');
    
    // Make a request to the backend service to start the harvest process
    // We'll use a background fetch to make the request asynchronous
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:3001';
    
    // Use the fetch API to trigger the harvest in the background
    fetch(`${backendUrl}/api/oai-pmh/sources/${id}/harvest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        harvestLogId: harvestLog.id,
        // You can add additional parameters here if needed
      }),
    }).catch(error => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error initiating harvest for source ${id}:`, error);
      // Update the harvest log to mark it as failed
      db('oai_pmh_harvest_logs')
        .where({ id: harvestLog.id })
        .update({
          status: 'failed',
          end_time: new Date().toISOString(),
          error_message: `Failed to initiate harvest: ${errorMessage}`,
          updated_at: new Date().toISOString()
        })
        .catch((updateError: Error) => {
          logger.error(`Error updating harvest log ${harvestLog.id}:`, updateError);
        });
    });
    
    // Update the source's last_harvested_at timestamp
    await db('oai_pmh_sources')
      .where({ id })
      .update({
        last_harvested_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    return NextResponse.json({
      message: 'Harvest initiated successfully',
      harvestLog
    });
  } catch (error) {
    logger.error(`Error triggering harvest for source ${params.id}:`, error);
    return NextResponse.json(
      { message: 'Error triggering harvest', error: String(error) },
      { status: 500 }
    );
  }
}
