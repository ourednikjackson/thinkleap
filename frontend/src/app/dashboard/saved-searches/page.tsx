'use client';
import { useState } from 'react';
import { SavedSearchesList } from '@/components/search/SavedSearchesList';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function SavedSearchesPage() {
  const [sortBy, setSortBy] = useState<string>('lastExecutedAt');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Saved Searches</h1>
        <Select 
          value={sortBy} 
          onValueChange={setSortBy}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lastExecutedAt">Last Executed</SelectItem>
            <SelectItem value="createdAt">Date Created</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="executionCount">Most Used</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <SavedSearchesList sortBy={sortBy} />
    </div>
  );
}