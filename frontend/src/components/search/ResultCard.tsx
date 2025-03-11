'use client';
import { useState } from 'react';
import { SearchResultItem } from '@thinkleap/shared/types/search';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookmarkIcon, ExternalLinkIcon, FileIcon, InfoIcon, DatabaseIcon } from 'lucide-react';
import { format } from 'date-fns';

interface ResultCardProps {
  result: SearchResultItem;
  onSave?: (result: SearchResultItem) => void;
}

export function ResultCard({ result, onSave }: ResultCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <Card className="overflow-hidden transition-all duration-200 hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{result.databaseId}</Badge>
            {result.publicationDate && (
              <span className="text-sm text-muted-foreground">
                {format(new Date(result.publicationDate), 'MMM d, yyyy')}
              </span>
            )}
          </div>
          
          <div className="flex gap-2">
            {onSave && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onSave(result)}
                title="Save this result"
              >
                <BookmarkIcon className="h-4 w-4" />
              </Button>
            )}
            
            {result.doi && (
              <Button 
                variant="ghost" 
                size="icon" 
                asChild
              >
                <a 
                  href={`https://doi.org/${result.doi}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  title="Open DOI"
                >
                  <ExternalLinkIcon className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </div>
        
        <CardTitle className="text-lg leading-tight mt-2">{result.title}</CardTitle>
        
        <div className="mt-2 text-sm text-muted-foreground">
          {result.authors.map(author => author.name).join(', ')}
        </div>
        
        {result.journal && (
          <div className="text-sm font-medium">
            {typeof result.journal === 'string' 
              ? result.journal
              : <>
                  {result.journal.name}
                  {result.journal.volume && ` • Volume ${result.journal.volume}`}
                  {result.journal.issue && ` • Issue ${result.journal.issue}`}
                </>
            }
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {result.abstract && (
          <div className={`overflow-hidden transition-all duration-300 ${expanded ? 'max-h-[500px]' : 'max-h-[100px]'}`}>
            <p className="text-sm text-muted-foreground">
              {result.abstract}
            </p>
          </div>
        )}
        
        {result.keywords && result.keywords.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
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
      </CardContent>
      
      <CardFooter className="flex items-center justify-between border-t px-6 py-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {result.databaseId.startsWith('oai-pmh') ? (
            <>
              <DatabaseIcon className="h-4 w-4" /> 
              <span>Source: {result.provider || 'OAI-PMH'}</span>
            </>
          ) : result.metadata && typeof result.metadata === 'object' && 'pmid' in result.metadata && result.metadata.pmid ? (
            <>
              <FileIcon className="h-4 w-4" /> 
              <a 
                href={`https://pubmed.ncbi.nlm.nih.gov/${String(result.metadata.pmid)}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                PMID: {String(result.metadata.pmid)}
              </a>
            </>
          ) : (
            <>
              <FileIcon className="h-4 w-4" /> 
              <span>ID: {result.id}</span>
            </>
          )}
        </div>
        
        {result.abstract ? (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1"
          >
            <InfoIcon className="h-3 w-3" />
            {expanded ? 'Show less' : 'Show more'}
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}