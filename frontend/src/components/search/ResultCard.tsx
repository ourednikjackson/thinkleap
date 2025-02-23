// app/(protected)/search/components/ResultCard.tsx
import { SearchResult } from '@thinkleap/shared/types/search';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';

interface ResultCardProps {
  result: SearchResult;
}

export function ResultCard({ result }: ResultCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-semibold">
            {result.title}
          </CardTitle>
          {result.publicationDate && (
            <span className="text-sm text-muted-foreground">
              {format(new Date(result.publicationDate), 'MMM d, yyyy')}
            </span>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {result.authors.map(author => author.name).join(', ')}
        </div>
        {result.journal && (
          <div className="text-sm font-medium">
            {result.journal.name}
            {result.journal.volume && ` • Volume ${result.journal.volume}`}
            {result.journal.issue && ` • Issue ${result.journal.issue}`}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {result.abstract && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {result.abstract}
          </p>
        )}
        <div className="mt-4 flex items-center gap-4 text-sm">
          {result.doi && (
            <a
              href={`https://doi.org/${result.doi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              DOI: {result.doi}
            </a>
          )}
          {result.keywords && result.keywords.length > 0 && (
            <div className="flex gap-2">
              {result.keywords.map(keyword => (
                <span
                  key={keyword}
                  className="bg-muted px-2 py-1 rounded-full text-xs"
                >
                  {keyword}
                </span>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}