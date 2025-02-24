'use client';
import { usePreferences } from '@/lib/preferences/PreferencesContext';
import { Card } from '@/components/ui/card';
import { Pagination } from '@/components/search/Pagination';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Calendar, FileText, Globe, Link, BookOpen } from 'lucide-react';
import { SearchResult, SearchResponse } from '@thinkleap/shared/types/search';
import { cn } from '@/lib/utils';
import { ExportDialog } from './ExportDialog';

interface SearchResultsProps {
  results: SearchResponse | null;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}

export function SearchResults({ results, isLoading, onPageChange }: SearchResultsProps) {
  const { preferences } = usePreferences();
  const isDense = preferences.display.density === 'compact';

  const formatAuthors = (authors: SearchResult['authors']) => {
    if (authors.length === 0) return 'No authors listed';
    if (authors.length <= 3) return authors.map(a => a.name).join(', ');
    return `${authors[0].name}, ${authors[1].name}, et al.`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(preferences.search.resultsPerPage)].map((_, i) => (
          <Card key={i} className={cn(
            "animate-pulse",
            isDense ? "p-3" : "p-6"
          )}>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </Card>
        ))}
      </div>
    );
  }

  if (!results || results.results.length === 0) {
    return (
      <Card className={cn(
        "text-center text-gray-500",
        isDense ? "p-3" : "p-6"
      )}>
        No results found
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">
          Showing {results.results.length} of {results.totalResults} results
        </div>
        <ExportDialog 
          results={results.results}
          totalResults={results.totalResults}
        />
      </div>

      <div className="space-y-4">
        {results.results.map((result) => (
          <Card 
            key={result.id} 
            className={cn(
              isDense ? "p-3 space-y-2" : "p-6 space-y-4"
            )}
          >
            {/* Title and Type */}
            <div className="flex justify-between items-start gap-4">
              <h3 className={cn(
                "font-medium",
                isDense ? "text-sm" : "text-base"
              )}>
                {result.title}
              </h3>
              {result.articleType && (
                <Badge variant="secondary" className="shrink-0">
                  {result.articleType}
                </Badge>
              )}
            </div>

            {/* Authors and Journal */}
            <div className={cn(
              "text-gray-600",
              isDense ? "text-xs space-y-1" : "text-sm space-y-2"
            )}>
              <p>{formatAuthors(result.authors)}</p>
              {result.journal && (
                <p className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  {result.journal.name}
                  {result.journal.volume && `, Volume ${result.journal.volume}`}
                  {result.journal.issue && `, Issue ${result.journal.issue}`}
                  {result.journal.pages && `, Pages ${result.journal.pages}`}
                </p>
              )}
            </div>

            {/* Abstract */}
            {result.abstract && (
              <p className={cn(
                "text-gray-600",
                isDense ? "text-xs" : "text-sm"
              )}>
                {result.abstract}
              </p>
            )}

            {/* Metadata Footer */}
            <div className={cn(
              "flex flex-wrap items-center gap-4 text-gray-500",
              isDense ? "text-xs" : "text-sm"
            )}>
              {result.publicationDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {result.publicationDate.toLocaleDateString()}
                </span>
              )}
              
              {result.citationCount !== undefined && (
                <span className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  {result.citationCount} citations
                </span>
              )}

              {result.language && (
                <span className="flex items-center gap-1">
                  <Globe className="h-4 w-4" />
                  {result.language}
                </span>
              )}

              {result.doi && (
                <a 
                  href={`https://doi.org/${result.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-gray-900"
                >
                  <Link className="h-4 w-4" />
                  DOI
                </a>
              )}

              {result.fullTextUrl && (
                <a 
                  href={result.fullTextUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-gray-900"
                >
                  <ExternalLink className="h-4 w-4" />
                  Full Text
                </a>
              )}

              <Badge variant="outline" className="ml-auto">
                {result.databaseId}
              </Badge>
            </div>
          </Card>
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