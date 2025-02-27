// frontend/src/components/search/ExportDialog.tsx
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { SearchResult } from '@thinkleap/shared/types/search';

interface ExportDialogProps {
  results: SearchResult[];
  totalResults: number;
  searchQuery: string; // Add searchQuery parameter
  searchFilters?: Record<string, any>; // Add filters parameter
}

export function ExportDialog({ 
  results, 
  totalResults,
  searchQuery,
  searchFilters = {}
}: ExportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [format, setFormat] = useState<'csv' | 'bibtex'>('csv');
  const [includeAbstract, setIncludeAbstract] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportAll, setExportAll] = useState(false); // New state for exporting all results

  const handleExport = async () => {
    try {
      setIsExporting(true);

      // If exportAll is true, use search parameters to get all results
      // Otherwise, use the IDs of the current page results only
      const payload = exportAll ? {
        // Send search parameters instead of full results
        query: searchQuery,
        filters: searchFilters,
        options: {
          format,
          includeAbstract
        }
      } : {
        // Send just the IDs of the current results (much smaller payload)
        resultIds: results.map(r => r.id),
        options: {
          format,
          includeAbstract
        }
      };

      const response = await fetch('/api/search/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `search-results.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setIsOpen(false);
      toast.success('Export completed successfully');
    } catch (error) {
      toast.error('Failed to export results');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Search Results</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Export Format</Label>
            <RadioGroup value={format} onValueChange={(value: 'csv' | 'bibtex') => setFormat(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv">CSV Format</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bibtex" id="bibtex" />
                <Label htmlFor="bibtex">BibTeX Format</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-abstract"
              checked={includeAbstract}
              onCheckedChange={(checked) => setIncludeAbstract(checked as boolean)}
            />
            <Label htmlFor="include-abstract">Include abstracts</Label>
          </div>

          {/* Add option to export all results vs current page only */}
          {totalResults > results.length && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="export-all"
                checked={exportAll}
                onCheckedChange={(checked) => setExportAll(checked as boolean)}
              />
              <Label htmlFor="export-all">
                Export all {totalResults} results (not just current page)
              </Label>
            </div>
          )}

          <div className="text-sm text-gray-500">
            {exportAll 
              ? `Exporting all ${totalResults} results` 
              : `Exporting ${results.length} of ${totalResults} results`}
          </div>

          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full"
          >
            {isExporting ? 'Exporting...' : 'Export Results'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}