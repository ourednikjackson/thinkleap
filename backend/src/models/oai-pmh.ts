/**
 * OAI-PMH source and harvested metadata models
 */

export interface OaiPmhSource {
  id: string;
  name: string;
  oai_endpoint: string;
  metadata_prefix: string;
  filter_providers: string[];
  harvest_frequency: string;
  last_harvested?: Date;
  status: string;
  settings?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface HarvestedMetadata {
  id: string;
  provider: string;
  record_id: string;
  title: string;
  authors: Array<{ name: string, identifier?: string }>;
  abstract?: string;
  publication_date?: Date;
  journal?: string;
  url?: string;
  doi?: string;
  keywords?: string[];
  source_id: string;
  full_metadata: any;
  created_at: Date;
  updated_at: Date;
}

export interface HarvestLog {
  id: string;
  source_id: string;
  started_at: Date;
  completed_at?: Date;
  status: string;
  records_processed: number;
  records_added: number;
  records_updated: number;
  records_failed: number;
  error_message?: string;
  details: any;
  created_at: Date;
  updated_at: Date;
}

export interface OaiPmhSourceCreateParams {
  name: string;
  oai_endpoint: string;
  metadata_prefix?: string;
  filter_providers?: string[];
  harvest_frequency?: string;
  status?: string;
  settings?: Record<string, any>;
}

export interface OaiPmhSourceUpdateParams {
  name?: string;
  oai_endpoint?: string;
  metadata_prefix?: string;
  filter_providers?: string[];
  harvest_frequency?: string;
  status?: string;
  settings?: Record<string, any>;
}

export interface SearchParams {
  query: string;
  page?: number;
  limit?: number;
  filters?: {
    dateRange?: {
      start?: string;
      end?: string;
    };
    authors?: string[];
    journals?: string[];
    keywords?: string[];
  };
}
