// app/(protected)/search/loading.tsx
import { SearchResultsSkeleton } from './SearchResultsSkeleton';
import { Card } from '@/components/ui/card';

export default function Loading() {
  return (
    <div className="container max-w-7xl mx-auto py-6 space-y-6">
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-3">
            <div className="h-10 bg-muted rounded animate-pulse" />
          </div>
          <div className="md:col-span-1">
            <div className="h-[400px] bg-muted rounded animate-pulse" />
          </div>
        </div>
      </Card>

      <SearchResultsSkeleton />
    </div>
  );
}