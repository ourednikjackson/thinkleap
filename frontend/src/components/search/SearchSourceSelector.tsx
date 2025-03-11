import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { logger } from '@/lib/logger';

interface SearchSourceSelectorProps {
  selectedSource: string;
  onSourceChange: (source: string) => void;
}

interface OaiPmhSource {
  id: string;
  name: string;
  provider: string;
  status: string;
}

const SearchSourceSelector: React.FC<SearchSourceSelectorProps> = ({
  selectedSource,
  onSourceChange
}) => {
  const [oaiPmhSources, setOaiPmhSources] = useState<OaiPmhSource[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchOaiPmhSources = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/admin/oai-pmh/sources?status=active');
        if (response.ok) {
          const data = await response.json();
          setOaiPmhSources(data.data || []);
        }
      } catch (error) {
        logger.error('Error fetching OAI-PMH sources:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOaiPmhSources();
  }, []);

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Search Sources</CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup
          defaultValue={selectedSource}
          value={selectedSource}
          onValueChange={onSourceChange}
          className="flex flex-wrap gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="source-all" />
            <Label htmlFor="source-all">All Sources</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="pubmed" id="source-pubmed" />
            <Label htmlFor="source-pubmed">PubMed</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="jstor" id="source-jstor" />
            <Label htmlFor="source-jstor">JSTOR</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="arxiv" id="source-arxiv" />
            <Label htmlFor="source-arxiv">arXiv</Label>
          </div>
          
          {/* Dynamically render OAI-PMH sources */}
          {oaiPmhSources.map(source => (
            <div key={source.id} className="flex items-center space-x-2">
              <RadioGroupItem 
                value={`oai-pmh-${source.id}`} 
                id={`source-oai-pmh-${source.id}`} 
              />
              <Label htmlFor={`source-oai-pmh-${source.id}`}>{source.name}</Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
};

export default SearchSourceSelector;
