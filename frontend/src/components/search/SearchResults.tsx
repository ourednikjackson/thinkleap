// app/(protected)/search/components/SearchResults.tsx
import { SearchResponse } from '@thinkleap/shared/types/search';
import { ResultCard } from './ResultCard';
import { Card } from '@/components/ui/card';
import { SearchResultsSkeleton } from './SearchResultsSkeleton';
import  NoResults  from './NoResults';
import { Pagination } from './Pagination';

interface SearchResultsProps {
  results: SearchResponse | null;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}

export function SearchResults({ results, isLoading, onPageChange }: SearchResultsProps) {
  if (isLoading) {
    return <SearchResultsSkeleton />;
  }

  if (!results || !results.results || results.results.length === 0) {
    return <NoResults />;
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Found {results.totalResults} results ({results.executionTimeMs}ms)
      </div>
      
      <div className="space-y-4">
        {results.results.map((result) => (
          <ResultCard key={`${result.databaseId}-${result.id}`} result={result} />
        ))}
      </div>

      <Pagination
        currentPage={results.page}
        totalPages={results.totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
}
