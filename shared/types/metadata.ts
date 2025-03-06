export interface MetadataRecord {
  id: string;
  recordId: string;
  institutionId: string;
  provider: string;
  title: string;
  abstract?: string;
  authors?: Author[];
  publicationDate?: Date;
  doi?: string;
  url?: string;
  isOpenAccess: boolean;
  keywords?: string;
  additionalMetadata?: Record<string, any>;
  harvestedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Author {
  name: string;
  orcid?: string;
  affiliation?: string;
}

export interface HarvestSource {
  id: string;
  institutionId: string;
  provider: string;
  baseUrl: string;
  metadataPrefix: string;
  setSpec?: string;
  lastHarvestedAt?: Date;
  resumptionToken?: string;
  active: boolean;
  batchSize: number;
  harvestFrequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  createdAt: Date;
  updatedAt: Date;
}

export interface UserAccessLog {
  id: string;
  userId: string;
  institutionId?: string;
  metadataRecordId: string;
  accessType: 'view' | 'download' | 'citation' | 'link';
  accessedAt: Date;
}

// Search result interface including institution-specific access information
export interface MetadataSearchResult extends MetadataRecord {
  hasAccess: boolean;
  accessUrl?: string;
  source: string;
}