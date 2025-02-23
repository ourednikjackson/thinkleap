// app/(protected)/search/error.tsx
'use client';

import { useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface ErrorProps {
  error: Error;
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Search page error:', error);
  }, [error]);

  return (
    <div className="container max-w-7xl mx-auto py-6">
      <Card className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            <p className="mb-4">
              {error.message || 'An unexpected error occurred while searching.'}
            </p>
            <Button onClick={reset}>Try again</Button>
          </AlertDescription>
        </Alert>
      </Card>
    </div>
  );
}