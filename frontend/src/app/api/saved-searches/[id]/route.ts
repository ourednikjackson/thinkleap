// API route for single saved search operations
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // Mock successful deletion
    console.log(`Deleting saved search: ${id}`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { message: 'Error deleting saved search' },
      { status: 500 }
    );
  }
}