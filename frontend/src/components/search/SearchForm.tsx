'use client';
import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import debounce from 'lodash/debounce';
import { usePreferences } from '@/lib/preferences/PreferencesContext';

interface SearchFormProps {
  onSearch: (query: string) => Promise<void>;
  isLoading: boolean;
}

export function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { preferences } = usePreferences();
  const [query, setQuery] = useState(searchParams.get('q') || '');

  const buildSearchUrl = (searchQuery: string) => {
    const params = new URLSearchParams({
      q: searchQuery,
      sortBy: preferences.search.defaultSortOrder,
      limit: preferences.search.resultsPerPage.toString(),
    });

    // Add default filters if they exist
    if (preferences.search.defaultFilters?.dateRange) {
      params.append('dateRange', preferences.search.defaultFilters.dateRange);
    }
    if (preferences.search.defaultFilters?.documentTypes?.length) {
      params.append('types', preferences.search.defaultFilters.documentTypes.join(','));
    }
    if (preferences.search.defaultFilters?.languages?.length) {
      params.append('languages', preferences.search.defaultFilters.languages.join(','));
    }

    return `/dashboard/search?${params.toString()}`;
  };

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      if (value.trim()) {
        router.push(buildSearchUrl(value));
        onSearch(value);
      }
    }, 300),
    [router, onSearch, preferences]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(buildSearchUrl(query));
      onSearch(query);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="search"
        placeholder="Search articles..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          debouncedSearch(e.target.value);
        }}
        className="flex-1"
      />
      <Button type="submit" disabled={isLoading}>
        <Search className="mr-2 h-4 w-4" />
        Search
      </Button>
    </form>
  );
}