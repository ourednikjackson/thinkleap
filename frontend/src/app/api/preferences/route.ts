// API route for user preferences
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { DEFAULT_PREFERENCES } from '../../../lib/preferences/PreferencesContext';

// Helper to validate auth token
async function validateAuth(request: NextRequest) {
  const { userId } = getAuth(request);
  if (!userId) {
    throw new Error('Unauthorized');
  }
  return userId;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await validateAuth(request);

    // For now, return default preferences since we're transitioning from the old auth system
    // This ensures the app continues to work while we implement the new preferences storage
    return NextResponse.json({
      data: DEFAULT_PREFERENCES,
      userId
    });
  } catch (error) {
    console.error('Error in preferences GET:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error fetching preferences' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await validateAuth(request);
    const body = await request.json();

    // Validate the request body
    if (!body.path || !Array.isArray(body.path) || body.value === undefined) {
      return NextResponse.json(
        { message: 'Invalid request body' },
        { status: 400 }
      );
    }

    // For now, return the default preferences with the updated value
    // This ensures the app continues to work while we implement the new preferences storage
    const updatedPreferences = { ...DEFAULT_PREFERENCES };
    let current: any = updatedPreferences;
    
    // Type-safe path traversal
    const validPaths = ['search', 'display', 'notifications'] as const;
    type ValidPath = typeof validPaths[number];
    
    const validSubPaths: Record<ValidPath, string[]> = {
      search: ['resultsPerPage', 'defaultSortOrder', 'defaultFilters'],
      display: ['theme', 'density'],
      notifications: ['emailAlerts', 'searchUpdates', 'newFeatures']
    };
    
    // Validate path
    const rootPath = body.path[0];
    if (!validPaths.includes(rootPath)) {
      return NextResponse.json(
        { message: 'Invalid preference path' },
        { status: 400 }
      );
    }

    // Update the preference value
    for (let i = 0; i < body.path.length - 1; i++) {
      const pathSegment = body.path[i];
      if (i === 0 && !validPaths.includes(pathSegment)) {
        throw new Error('Invalid preference path');
      }
      current = current[pathSegment];
    }
    
    const finalPath = body.path[body.path.length - 1];
    if (!validSubPaths[rootPath as ValidPath].includes(finalPath)) {
      throw new Error('Invalid preference path');
    }
    
    current[finalPath] = body.value;

    return NextResponse.json({
      data: updatedPreferences,
      userId
    });
  } catch (error) {
    console.error('Error in preferences PATCH:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error updating preferences' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}