// backend/src/services/search/databases/pubmed/types.ts
import { DatabaseConfig } from '../types';

// Using DatabaseConfig directly as it now includes everything we need
export type PubMedConfig = DatabaseConfig;

export interface PubMedSearchResponse {
  esearchresult: {
    count: string;
    retmax: string;
    retstart: string;
    idlist: string[];
    translationset: Array<{
      from: string;
      to: string;
    }>;
  };
}

export interface PubMedArticle {
  MedlineCitation: {
    PMID: string;
    Article: {
      ArticleTitle: string;
      Abstract?: {
        AbstractText: string | string[];
      };
      AuthorList?: {
        Author: Array<{
          LastName?: string;
          ForeName?: string;
          Affiliation?: string;
        }>;
      };
      Journal: {
        Title: string;
        JournalIssue: {
          Volume?: string;
          Issue?: string;
          PubDate: {
            Year?: string;
            Month?: string;
            Day?: string;
          };
        };
      };
    };
    KeywordList?: {
      Keyword: string[];
    };
  };
  PubmedData?: {
    ArticleIdList: Array<{
      ArticleId: string;
      IdType: string;
    }>;
  };
}