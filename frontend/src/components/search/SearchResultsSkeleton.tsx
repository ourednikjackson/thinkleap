// components/search/SearchResultsSkeleton.tsx
import { Card, CardHeader, CardContent } from '@/components/ui/card';

export function SearchResultsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((n) => (
        <Card key={n} className="animate-pulse">
          <CardHeader>
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-3 bg-muted rounded w-1/2 mt-2"></div>
            <div className="h-3 bg-muted rounded w-1/3 mt-2"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="h-3 bg-muted rounded"></div>
              <div className="h-3 bg-muted rounded"></div>
              <div className="h-3 bg-muted rounded w-3/4"></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}