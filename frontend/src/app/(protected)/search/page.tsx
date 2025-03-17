// frontend/src/app/(protected)/search/page.tsx

'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { usePreferences } from '@/lib/preferences/PreferencesContext';
import { SearchForm } from '@/components/search/SearchForm';
import { FilterPanel } from '@/components/search/FilterPanel';
import { SearchResults } from '@/components/search/SearchResults';
import { SearchResult, SearchFilters } from '@thinkleap/shared/types/search';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SearchPage() {
  const { user, isLoaded } = useUser();
  const { preferences } = usePreferences();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{data: SearchResult} | null>(null);

  // Initialize filters with empty arrays for authors and journals
  const [filters, setFilters] = useState<SearchFilters>({
    dateRange: undefined,
    authors: [],
    journals: [],
    articleTypes: preferences.search.defaultFilters?.documentTypes,
    languages: preferences.search.defaultFilters?.languages
  });

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in?redirect_url=/search');
    }
  }, [user, isLoaded, router]);

  const handleSearch = async (query: string, page = 1) => {
    if (!query || query.trim() === '') return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams({
        q: query,
        page: page.toString(),
        limit: preferences.search.resultsPerPage.toString(),
        sortBy: preferences.search.defaultSortOrder,
        filters: JSON.stringify(filters)
      });
      
      const response = await fetch(`/api/search?${queryParams}`, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Search failed');
      }
      
      const data = await response.json();
      
      // Store in client cache for reuse
      const cacheKey = `search:${queryParams.toString()}`;
      localStorage.setItem(cacheKey, JSON.stringify({
        value: data,
        expires: Date.now() + (5 * 60 * 1000) // 5 minutes
      }));
      
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Determine if error is a network issue
  const isNetworkError = error && (
    error.includes('fetch failed') || 
    error.includes('network') || 
    error.includes('EAI_AGAIN') || 
    error.includes('ECONNREFUSED') ||
    error.includes('timeout')
  );

  return (
    <div className="container max-w-7xl mx-auto py-6 space-y-6">
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-3">
            <SearchForm onSearch={handleSearch} isLoading={isLoading} />
          </div>
          <div className="md:col-span-1">
            <FilterPanel 
              filters={filters} 
              onFiltersChange={setFilters}
            />
          </div>
        </div>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {isNetworkError ? (
              <>
                <strong>Network issue detected:</strong> There was a problem connecting to the PubMed database. 
                This may be due to temporary connectivity issues. Please try again in a few moments.
              </>
            ) : (
              error
            )}
          </AlertDescription>
        </Alert>
      )}

      <SearchResults
        results={results}
        isLoading={isLoading}
        onPageChange={(page) => {
          handleSearch(searchParams.get('q') || '', page);
        }}
        filters={filters}
      />
    </div>
  );
}