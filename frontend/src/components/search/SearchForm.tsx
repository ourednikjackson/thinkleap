// app/(protected)/search/components/SearchForm.tsx
'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import debounce from 'lodash/debounce';

interface SearchFormProps {
  onSearch: (query: string) => Promise<void>;
  isLoading: boolean;
}

export function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      router.push(`/search?q=${encodeURIComponent(value)}`);
      onSearch(value);
    }, 300),
    [router, onSearch]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
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
