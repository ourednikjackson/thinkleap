// app/(protected)/search/components/NoResults.tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Search } from 'lucide-react';

export default function NoResults() {
  return (
    <Card className="text-center py-8">
      <CardHeader>
        <div className="flex justify-center mb-4">
          <Search className="h-12 w-12 text-muted-foreground" />
        </div>
        <CardTitle>No results found</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Try adjusting your search terms or filters
        </p>
      </CardContent>
    </Card>
  );
}