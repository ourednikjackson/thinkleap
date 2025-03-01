// app/(protected)/search/components/FilterPanel.tsx
'use client';

import { useState } from 'react';
import { SearchFilters } from '@thinkleap/shared/types/search';
import { DateRangeFilter } from './DateRangeFilter';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FilterPanelProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
}

export function FilterPanel({ filters, onFiltersChange }: FilterPanelProps) {
  const [author, setAuthor] = useState('');
  const [journal, setJournal] = useState('');

  const addAuthor = () => {
    if (author.trim()) {
      onFiltersChange({
        ...filters,
        authors: [...(filters.authors || []), author.trim()]
      });
      setAuthor('');
    }
  };
  
  const removeAuthor = (authorToRemove: string) => {
    if (!filters.authors) return;
    
    onFiltersChange({
      ...filters,
      authors: filters.authors.filter(a => a !== authorToRemove)
    });
  };

  const addJournal = () => {
    if (journal.trim()) {
      onFiltersChange({
        ...filters,
        journals: [...(filters.journals || []), journal.trim()]
      });
      setJournal('');
    }
  };

  const removeJournal = (journalToRemove: string) => {
    onFiltersChange({
      ...filters,
      journals: filters.journals?.filter(j => j !== journalToRemove)
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filters</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="date-range">
            <AccordionTrigger>Date Range</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                <DateRangeFilter
                  dateRange={filters.dateRange}
                  onChange={(dateRange) =>
                    onFiltersChange({ ...filters, dateRange })
                  }
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="authors">
            <AccordionTrigger>Authors</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add author..."
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addAuthor()}
                  />
                  <Button onClick={addAuthor} variant="secondary">Add</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {filters.authors?.map((author) => (
                    <Badge
                      key={author}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeAuthor(author)}
                    >
                      {author} ×
                    </Badge>
                  ))}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="journals">
            <AccordionTrigger>Journals</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add journal..."
                    value={journal}
                    onChange={(e) => setJournal(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addJournal()}
                  />
                  <Button onClick={addJournal} variant="secondary">Add</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {filters.journals?.map((journal) => (
                    <Badge
                      key={journal}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeJournal(journal)}
                    >
                      {journal} ×
                    </Badge>
                  ))}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}