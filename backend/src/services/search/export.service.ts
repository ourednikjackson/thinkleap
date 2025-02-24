import { SearchResult } from '@thinkleap/shared/types/search';
import { Logger } from '../logger';

export type ExportFormat = 'csv' | 'bibtex';

export interface ExportOptions {
  format: ExportFormat;
  fields?: string[];
  includeAbstract?: boolean;
}

export class SearchExportService {
  constructor(private readonly logger: Logger) {}

  async exportResults(results: SearchResult[], options: ExportOptions): Promise<string> {
    try {
      switch (options.format) {
        case 'csv':
          return this.exportToCsv(results, options);
        case 'bibtex':
          return this.exportToBibtex(results);
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      this.logger.error('Failed to export results', error);
      throw error;
    }
  }

  private exportToCsv(results: SearchResult[], options: ExportOptions): string {
    const headers = [
      'Title',
      'Authors',
      'Journal',
      'Publication Date',
      'DOI',
      options.includeAbstract ? 'Abstract' : null,
      'Keywords',
      'Citation Count',
      'Type',
      'Language',
    ].filter(Boolean);

    const rows = results.map(result => [
      this.escapeCsvField(result.title),
      this.escapeCsvField(result.authors.map(a => a.name).join('; ')),
      this.escapeCsvField(result.journal?.name || ''),
      result.publicationDate?.toISOString().split('T')[0] || '',
      result.doi || '',
      options.includeAbstract ? this.escapeCsvField(result.abstract || '') : null,
      this.escapeCsvField(result.keywords?.join('; ') || ''),
      result.citationCount?.toString() || '',
      result.articleType || '',
      result.language || '',
    ].filter(Boolean));

    return [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
  }

  private exportToBibtex(results: SearchResult[]): string {
    return results.map(result => {
      const authors = result.authors.map(a => a.name).join(' and ');
      const id = result.doi?.replace(/[^a-zA-Z0-9]/g, '') || 
                 result.title.toLowerCase().replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
      const year = result.publicationDate?.getFullYear() || 'unknown';

      return `@article{${id}${year},
  title = {${result.title}},
  author = {${authors}},
  ${result.journal ? `journal = {${result.journal.name}},` : ''}
  year = {${year}},
  ${result.doi ? `doi = {${result.doi}},` : ''}
  ${result.abstract ? `abstract = {${result.abstract}},` : ''}
  ${result.keywords?.length ? `keywords = {${result.keywords.join(', ')}},` : ''}
}`;
    }).join('\n\n');
  }

  private escapeCsvField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }
}