// backend/src/services/search/databases/pubmed/connector.ts
import { XMLParser } from 'fast-xml-parser';
import { BaseDatabaseConnector } from '../base.connector';
import { SearchQuery, SearchResult, Author, Journal } from '@thinkleap/shared/types/search';
import { Logger } from '../../../logger';
import { CacheService } from '../../../cache';
import { PubMedConfig, PubMedSearchResponse, PubMedArticle } from './types';
import { SearchError } from '../types';

export class PubMedConnector extends BaseDatabaseConnector {
  private readonly parser: XMLParser;
  private readonly baseUrl: string;

  constructor(
    config: PubMedConfig,
    logger: Logger,
    cacheService: CacheService
  ) {
    super(config, logger, cacheService);
    this.parser = new XMLParser({
      ignoreAttributes: false,
      parseAttributeValue: true
    });
    this.baseUrl = config.baseUrl;
  }

  get name(): string {
    return 'PubMed';
  }

  async validateAccess(): Promise<boolean> {
    // PubMed is openly accessible
    return true;
  }

  async authenticate(): Promise<void> {
    // No authentication needed for basic access
  }

  async search(query: SearchQuery): Promise<SearchResult[]> {
    try {
      // First get article IDs
      const searchResponse = await this.searchArticles(query);
      
      if (!searchResponse.esearchresult.idlist.length) {
        return [];
      }

      // Then fetch full article details
      const articles = await this.fetchArticleDetails(
        searchResponse.esearchresult.idlist
      );

      return articles.map(this.transformArticle);
    } catch (error) {
      throw this.transformError(error);
    }
  }

  private async searchArticles(query: SearchQuery): Promise<PubMedSearchResponse> {
    const params = new URLSearchParams({
      db: 'pubmed',
      term: this.buildSearchTerm(query),
      retmax: query.pagination.limit.toString(),
      retstart: ((query.pagination.page - 1) * query.pagination.limit).toString(),
      retmode: 'json'
    });

    if (this.config.auth?.apiKey) {
      params.append('api_key', this.config.auth.apiKey);
    }

    const response = await this.withRetry(() =>
      fetch(`${this.baseUrl}/esearch.fcgi?${params}`)
    );

    if (!response.ok) {
      throw new Error(`PubMed search failed: ${response.statusText}`);
    }

    return await response.json();
  }

  private async fetchArticleDetails(pmids: string[]): Promise<PubMedArticle[]> {
    const params = new URLSearchParams({
      db: 'pubmed',
      id: pmids.join(','),
      retmode: 'xml'
    });

    if (this.config.auth?.apiKey) {
      params.append('api_key', this.config.auth.apiKey);
    }

    const response = await this.withRetry(() =>
      fetch(`${this.baseUrl}/efetch.fcgi?${params}`)
    );

    if (!response.ok) {
      throw new Error(`PubMed fetch failed: ${response.statusText}`);
    }

    const xml = await response.text();
    const result = this.parser.parse(xml);
    
    return Array.isArray(result.PubmedArticleSet.PubmedArticle) 
      ? result.PubmedArticleSet.PubmedArticle 
      : [result.PubmedArticleSet.PubmedArticle];
  }

  private buildSearchTerm(query: SearchQuery): string {
    const terms = [query.term];

    if (query.filters?.dateRange) {
      const { start, end } = query.filters.dateRange;
      if (start) terms.push(`"${start.getFullYear()}/01/01"[Date - Publication] : `);
      if (end) terms.push(`"${end.getFullYear()}/12/31"[Date - Publication]`);
    }

    if (query.filters?.authors?.length) {
      terms.push(query.filters.authors.map(author => 
        `${author}[Author]`
      ).join(' OR '));
    }

    if (query.filters?.journals?.length) {
      terms.push(query.filters.journals.map(journal =>
        `"${journal}"[Journal]`
      ).join(' OR '));
    }

    return terms.join(' AND ');
  }

  private transformArticle(article: PubMedArticle): SearchResult {
    const citation = article.MedlineCitation;
    const pubmedData = article.PubmedData;

    const authors: Author[] = citation.Article.AuthorList?.Author.map(author => ({
      name: `${author.LastName || ''} ${author.ForeName || ''}`.trim(),
      affiliation: author.Affiliation
    })) || [];

    const journal: Journal = {
      name: citation.Article.Journal.Title,
      volume: citation.Article.Journal.JournalIssue.Volume,
      issue: citation.Article.Journal.JournalIssue.Issue
    };

    const doi = pubmedData?.ArticleIdList
      .find(id => id.IdType === 'doi')
      ?.ArticleId;

    return {
      id: citation.PMID,
      databaseId: 'pubmed',
      title: citation.Article.ArticleTitle,
      authors,
      abstract: Array.isArray(citation.Article.Abstract?.AbstractText)
        ? citation.Article.Abstract.AbstractText.join(' ')
        : citation.Article.Abstract?.AbstractText || undefined,
      journal,
      doi,
      publicationDate: this.parsePublicationDate(citation.Article.Journal.JournalIssue.PubDate),
      keywords: citation.KeywordList?.Keyword || [],
      metadata: {
        pmid: citation.PMID
      }
    };
  }

  private parsePublicationDate(pubDate: { Year?: string; Month?: string; Day?: string }): Date | undefined {
    if (!pubDate.Year) return undefined;

    const month = pubDate.Month || '01';
    const day = pubDate.Day || '01';
    
    return new Date(`${pubDate.Year}-${month}-${day}`);
  }

  protected transformError(error: unknown): SearchError {
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        return {
          name: 'RateLimitError',
          message: 'PubMed rate limit exceeded',
          type: 'rate_limit',
          retryable: true,
          source: 'pubmed'
        };
      }

      return {
        name: error.name,
        message: error.message,
        type: 'unknown',
        retryable: true,
        source: 'pubmed'
      };
    }

    return {
      name: 'UnknownError',
      message: 'An unknown error occurred',
      type: 'unknown',
      retryable: false,
      source: 'pubmed'
    };
  }
}