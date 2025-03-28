'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { usePreferences } from '@/lib/preferences/PreferencesContext';
import { SearchForm } from '@/components/search/SearchForm';
import { FilterPanel } from '@/components/search/FilterPanel';
import { SearchResults } from '@/components/search/SearchResults';
import { SearchResponse, SearchFilters } from '@thinkleap/shared/types/search';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SearchPage() {
  const { user } = useAuth();
  const { preferences } = usePreferences();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{data: SearchResponse} | null>(null);

  // Initialize filters with empty arrays for authors and journals
  // Initialize with defaults and update after preferences load
  const [filters, setFilters] = useState<SearchFilters>({
    dateRange: undefined,
    authors: [],
    journals: [],
    articleTypes: [],
    languages: ['en']
  });
  
  // Update filters when preferences change
  useEffect(() => {
    if (preferences) {
      setFilters(prev => ({
        ...prev,
        articleTypes: preferences.search.defaultFilters?.documentTypes || [],
        languages: preferences.search.defaultFilters?.languages || ['en']
      }));
    }
  }, [preferences]);

  // Authentication check is handled by middleware
  // No need to redirect here as it causes loops

  const handleSearch = async (query: string, page = 1) => {
    if (!query || query.trim() === '') return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams({
        q: query,
        page: page.toString(),
        limit: (preferences.search.resultsPerPage || 10).toString(),
        sortBy: preferences.search.defaultSortOrder || 'relevance',
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
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <SearchResults
        results={results}
        isLoading={isLoading}
        onPageChange={(page) => {
          handleSearch(searchParams.get('q') || '', page);
        }}
      />
    </div>
  );
}