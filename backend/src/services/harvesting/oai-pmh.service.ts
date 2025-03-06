import { v4 as uuidv4 } from 'uuid';
// Comment out node-fetch for now as it's an ESM module
// import fetch from 'node-fetch';
import * as schedule from 'node-schedule';
import { XMLParser } from 'fast-xml-parser';
import { DatabaseService } from '../database/database.service';
import { LoggerService } from '../logger/logger.service';
import { CacheService } from '../cache';
import axios from 'axios';

// Simple OAI-PMH client implementation
class OaiPmh {
  constructor(private baseUrl: string) {}
  
  async listRecords(params: any): Promise<{ records: any[], resumptionToken?: string }> {
    const url = new URL(this.baseUrl);
    
    // Add OAI-PMH verb
    url.searchParams.append('verb', 'ListRecords');
    
    // Add other parameters
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.append(key, value as string);
    }
    
    // Fetch data using axios instead of fetch
    const response = await axios.get(url.toString());
    if (response.status !== 200) {
      throw new Error(`OAI-PMH request failed: ${response.status} ${response.statusText}`);
    }
    
    const xml = response.data;
    const parser = new XMLParser({
      attributeNamePrefix: '@_',
      ignoreAttributes: false
    });
    const result = parser.parse(xml);
    
    // Extract records and resumption token
    const oaiResponse = result.OAI_PMH?.ListRecords || {};
    const records = oaiResponse.record || [];
    // Extract resumption token if available
    let resumptionToken = null;
    if (oaiResponse.resumptionToken && oaiResponse.resumptionToken['#text']) {
      resumptionToken = oaiResponse.resumptionToken['#text'];
    }
    
    return {
      records: Array.isArray(records) ? records : [records],
      resumptionToken: resumptionToken
    };
  }
}

interface CrossrefWork {
  DOI?: string;
  title?: string[];
  abstract?: string;
  author?: Array<{
    given?: string;
    family?: string;
    name?: string;
    ORCID?: string;
    affiliation?: Array<{ name?: string }>;
  }>;
  published?: {
    'date-parts'?: number[][];
  };
  is_open_access?: boolean;
  publisher?: string;
  URL?: string;
  subject?: string[];
}

export class OaiPmhService {
  constructor(
    private databaseService: DatabaseService,
    private logger: LoggerService,
    private cacheService: CacheService
  ) {
    // Initialize the scheduled harvesting
    this.initScheduledHarvesting();
  }

  /**
   * Initialize scheduled harvesting for all active harvest sources
   */
  private initScheduledHarvesting(): void {
    // Schedule the job to run daily at 1 AM
    schedule.scheduleJob('0 1 * * *', async () => {
      try {
        // Get all active harvest sources
        const sources = await this.databaseService.knex('harvest_sources')
          .where('active', true)
          .select();
        
        // Process each source
        for (const source of sources) {
          try {
            const now = new Date();
            const lastHarvested = source.last_harvested_at ? new Date(source.last_harvested_at) : null;
            let shouldHarvest = false;
            
            // Determine if harvesting is required based on frequency
            switch (source.harvest_frequency) {
              case 'hourly':
                shouldHarvest = !lastHarvested || (now.getTime() - lastHarvested.getTime() > 60 * 60 * 1000);
                break;
              case 'daily':
                shouldHarvest = !lastHarvested || (now.getTime() - lastHarvested.getTime() > 24 * 60 * 60 * 1000);
                break;
              case 'weekly':
                shouldHarvest = !lastHarvested || (now.getTime() - lastHarvested.getTime() > 7 * 24 * 60 * 60 * 1000);
                break;
              case 'monthly':
                // Approximate month as 30 days
                shouldHarvest = !lastHarvested || (now.getTime() - lastHarvested.getTime() > 30 * 24 * 60 * 60 * 1000);
                break;
              default:
                shouldHarvest = !lastHarvested || (now.getTime() - lastHarvested.getTime() > 24 * 60 * 60 * 1000);
            }
            
            if (shouldHarvest) {
              await this.harvestMetadata(source.id);
            }
          } catch (error) {
            this.logger.error('Error harvesting source', { error, sourceId: source.id });
          }
        }
      } catch (error) {
        this.logger.error('Error in scheduled harvesting', { error });
      }
    });
  }

  /**
   * Harvest metadata from a specific source
   * @param sourceId Harvest source ID
   */
  async harvestMetadata(sourceId: string): Promise<void> {
    try {
      // Get the harvest source
      const source = await this.databaseService.knex('harvest_sources')
        .where('id', sourceId)
        .first();
      
      if (!source) {
        throw new Error(`Harvest source not found: ${sourceId}`);
      }
      
      // Initialize OAI-PMH client
      const oaiPmh = new OaiPmh(source.base_url);
      
      // Set up the request parameters
      const params: any = {
        metadataPrefix: source.metadata_prefix
      };
      
      if (source.set_spec) {
        params.set = source.set_spec;
      }
      
      // If resumption token exists, use it instead
      if (source.resumption_token) {
        params.resumptionToken = source.resumption_token;
      } else if (source.last_harvested_at) {
        // If not the first run, use from parameter with last harvest date
        params.from = new Date(source.last_harvested_at).toISOString().split('T')[0];
      }
      
      // Get batch of records
      const response = await oaiPmh.listRecords(params);
      const { records, resumptionToken } = response;
      
      // Process records in batches
      await this.processRecords(records, source.institution_id, source.provider);
      
      // Update the harvest source with new resumption token and last harvested timestamp
      await this.databaseService.knex('harvest_sources')
        .where('id', sourceId)
        .update({
          resumption_token: resumptionToken || null,
          last_harvested_at: new Date()
        });
      
      this.logger.info('OAI-PMH harvest completed', { 
        sourceId, 
        recordsHarvested: records.length,
        hasMoreRecords: !!resumptionToken
      });
      
      // If there are more records (resumption token exists), schedule the next batch
      if (resumptionToken) {
        // Schedule next batch with a delay to avoid overloading the server
        setTimeout(() => {
          this.harvestMetadata(sourceId).catch(error => {
            this.logger.error('Error in continuation harvest', { error, sourceId });
          });
        }, 5000); // 5 second delay
      }
    } catch (error) {
      this.logger.error('Error harvesting OAI-PMH metadata', { error, sourceId });
      throw error;
    }
  }

  /**
   * Process a batch of OAI-PMH records
   * @param records OAI-PMH records
   * @param institutionId Institution ID
   * @param provider Provider name
   */
  private async processRecords(records: any[], institutionId: string, provider: string): Promise<void> {
    // Batch process to avoid large transactions
    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      // Use transaction for each batch to ensure data consistency
      await this.databaseService.knex.transaction(async (trx) => {
        for (const record of batch) {
          try {
            const metadata = record.metadata;
            const recordId = record.header.identifier;
            
            // Skip deleted records
            if (record.header.status === 'deleted') {
              continue;
            }
            
            // Extract basic metadata
            const title = this.extractMetadataField(metadata, 'title') || 'Untitled';
            const authors = this.extractAuthors(metadata);
            const doi = this.extractDOI(metadata);
            const abstract = this.extractMetadataField(metadata, 'description') || '';
            const publicationDate = this.extractDate(metadata);
            const url = this.extractMetadataField(metadata, 'identifier') || '';
            const keywords = this.extractMetadataField(metadata, 'subject') || '';
            
            // Check if record already exists
            const existingRecord = await trx('metadata_records')
              .where({
                record_id: recordId,
                provider,
                institution_id: institutionId
              })
              .first();
            
            if (existingRecord) {
              // Update existing record
              await trx('metadata_records')
                .where('id', existingRecord.id)
                .update({
                  title,
                  abstract,
                  authors: JSON.stringify(authors),
                  publication_date: publicationDate,
                  doi,
                  url,
                  keywords,
                  additional_metadata: JSON.stringify(metadata),
                  harvested_at: new Date(),
                  updated_at: new Date()
                });
            } else {
              // Create new record
              await trx('metadata_records').insert({
                id: uuidv4(),
                record_id: recordId,
                institution_id: institutionId,
                provider,
                title,
                abstract,
                authors: JSON.stringify(authors),
                publication_date: publicationDate,
                doi,
                url,
                is_open_access: false, // Default, will be enriched later
                keywords,
                additional_metadata: JSON.stringify(metadata),
                harvested_at: new Date(),
                created_at: new Date(),
                updated_at: new Date()
              });
            }
            
            // If record has DOI, enrich it using Crossref in the background
            if (doi) {
              // Don't await this - let it run in the background
              this.enrichRecordFromCrossref(doi, recordId, provider, institutionId)
                .catch(error => this.logger.error('Error enriching from Crossref', { error, doi }));
            }
          } catch (error) {
            this.logger.error('Error processing OAI-PMH record', { 
              error, 
              recordId: record.header?.identifier,
              provider,
              institutionId
            });
          }
        }
      });
    }
  }

  /**
   * Extract authors from metadata
   */
  private extractAuthors(metadata: any): Array<{ name: string, orcid?: string, affiliation?: string }> {
    const creators = metadata.creator || [];
    const contributors = metadata.contributor || [];
    
    const authors = [];
    
    // Process creators as primary authors
    if (Array.isArray(creators)) {
      for (const creator of creators) {
        authors.push({ name: creator });
      }
    } else if (creators) {
      authors.push({ name: creators });
    }
    
    // Process contributors as additional authors
    if (Array.isArray(contributors)) {
      for (const contributor of contributors) {
        authors.push({ name: contributor });
      }
    } else if (contributors) {
      authors.push({ name: contributors });
    }
    
    return authors;
  }

  /**
   * Extract DOI from metadata
   */
  private extractDOI(metadata: any): string | undefined {
    const identifiers = metadata.identifier;
    
    if (!identifiers) {
      return undefined;
    }
    
    if (Array.isArray(identifiers)) {
      for (const id of identifiers) {
        if (typeof id === 'string' && id.startsWith('10.')) {
          return id;
        }
      }
    } else if (typeof identifiers === 'string' && identifiers.startsWith('10.')) {
      return identifiers;
    }
    
    return undefined;
  }

  /**
   * Extract publication date from metadata
   */
  private extractDate(metadata: any): Date | undefined {
    const date = metadata.date;
    
    if (!date) {
      return undefined;
    }
    
    try {
      if (Array.isArray(date)) {
        return new Date(date[0]);
      } else {
        return new Date(date);
      }
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Extract a field from metadata
   */
  private extractMetadataField(metadata: any, fieldName: string): string | undefined {
    const field = metadata[fieldName];
    
    if (!field) {
      return undefined;
    }
    
    if (Array.isArray(field)) {
      return field.join(', ');
    }
    
    return field;
  }

  /**
   * Enrich a record with data from Crossref
   */
  private async enrichRecordFromCrossref(
    doi: string, 
    recordId: string, 
    provider: string, 
    institutionId: string
  ): Promise<void> {
    try {
      // Check cache first to avoid redundant API calls
      const cacheKey = `crossref:${doi}`;
      const cachedData = await this.cacheService.get(cacheKey);
      
      if (cachedData) {
        await this.updateRecordWithCrossrefData(JSON.parse(cachedData), recordId, provider, institutionId);
        return;
      }
      
      // Call Crossref API with axios
      const response = await axios.get(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
        headers: {
          'User-Agent': 'ThinkLeap/1.0 (support@thinkleap.io)'
        }
      });
      
      if (response.status !== 200) {
        throw new Error(`Crossref API error: ${response.status} ${response.statusText}`);
      }
      
      const data = response.data;
      const work = data.message as CrossrefWork;
      
      // Cache the data for future use
      await this.cacheService.set(cacheKey, JSON.stringify(work), 60 * 60 * 24 * 7); // 1 week
      
      // Update the record with the enriched data
      await this.updateRecordWithCrossrefData(work, recordId, provider, institutionId);
    } catch (error) {
      this.logger.error('Error enriching record from Crossref', { error, doi });
    }
  }

  /**
   * Update a record with data from Crossref
   */
  private async updateRecordWithCrossrefData(
    work: CrossrefWork, 
    recordId: string, 
    provider: string, 
    institutionId: string
  ): Promise<void> {
    try {
      // Get the record
      const record = await this.databaseService.knex('metadata_records')
        .where({
          record_id: recordId,
          provider,
          institution_id: institutionId
        })
        .first();
      
      if (!record) {
        return;
      }
      
      // Prepare the update data
      const updateData: any = {
        updated_at: new Date()
      };
      
      // Update title if available
      if (work.title && work.title.length > 0) {
        updateData.title = work.title[0];
      }
      
      // Update abstract if available
      if (work.abstract) {
        updateData.abstract = work.abstract;
      }
      
      // Update authors if available
      if (work.author && work.author.length > 0) {
        const authors = work.author.map(author => ({
          name: author.name || `${author.given || ''} ${author.family || ''}`.trim(),
          orcid: author.ORCID,
          affiliation: author.affiliation && author.affiliation.length > 0 
            ? author.affiliation[0].name 
            : undefined
        }));
        
        updateData.authors = JSON.stringify(authors);
      }
      
      // Update publication date if available
      if (work.published && work.published['date-parts'] && work.published['date-parts'].length > 0) {
        const dateParts = work.published['date-parts'][0];
        if (dateParts.length >= 3) {
          updateData.publication_date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
        } else if (dateParts.length >= 2) {
          updateData.publication_date = new Date(dateParts[0], dateParts[1] - 1, 1);
        } else if (dateParts.length >= 1) {
          updateData.publication_date = new Date(dateParts[0], 0, 1);
        }
      }
      
      // Update open access status
      if (work.is_open_access !== undefined) {
        updateData.is_open_access = work.is_open_access;
      }
      
      // Update URL if available
      if (work.URL) {
        updateData.url = work.URL;
      }
      
      // Update keywords if available
      if (work.subject && work.subject.length > 0) {
        updateData.keywords = work.subject.join(', ');
      }
      
      // Add publisher to additional metadata
      if (work.publisher) {
        const additionalMetadata = record.additional_metadata || {};
        additionalMetadata.publisher = work.publisher;
        updateData.additional_metadata = JSON.stringify(additionalMetadata);
      }
      
      // Update the record
      await this.databaseService.knex('metadata_records')
        .where('id', record.id)
        .update(updateData);
    } catch (error) {
      this.logger.error('Error updating record with Crossref data', { error, recordId });
    }
  }

  /**
   * Seed initial metadata from Crossref for testing
   * @param institutionId Institution ID to associate with records
   * @param provider Provider name
   * @param limit Number of records to seed
   */
  async seedInitialMetadata(institutionId: string, provider: string, limit = 1000): Promise<void> {
    try {
      // Use Crossref API to get initial records for testing
      const response = await axios.get(
        `https://api.crossref.org/works?rows=${limit}&sort=published`,
        {
          headers: {
            'User-Agent': 'ThinkLeap/1.0 (support@thinkleap.io)'
          }
        }
      );
      
      if (response.status !== 200) {
        throw new Error(`Crossref API error: ${response.status} ${response.statusText}`);
      }
      
      const data = response.data;
      const works = data.message.items as CrossrefWork[];
      
      // Process records in batches
      const batchSize = 100;
      for (let i = 0; i < works.length; i += batchSize) {
        const batch = works.slice(i, i + batchSize);
        
        // Use transaction for each batch
        await this.databaseService.knex.transaction(async (trx) => {
          for (const work of batch) {
            try {
              if (!work.DOI || !work.title || work.title.length === 0) {
                continue;
              }
              
              // Extract metadata
              const title = work.title[0];
              const abstract = work.abstract || '';
              const doi = work.DOI;
              
              // Convert authors
              const authors = work.author?.map(a => ({
                name: a.name || `${a.given || ''} ${a.family || ''}`.trim(),
                orcid: a.ORCID,
                affiliation: a.affiliation && a.affiliation.length > 0 ? a.affiliation[0].name : undefined
              })) || [];
              
              // Process publication date
              let publicationDate: Date | undefined;
              if (work.published && work.published['date-parts'] && work.published['date-parts'].length > 0) {
                const dateParts = work.published['date-parts'][0];
                if (dateParts.length >= 3) {
                  publicationDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
                } else if (dateParts.length >= 2) {
                  publicationDate = new Date(dateParts[0], dateParts[1] - 1, 1);
                } else if (dateParts.length >= 1) {
                  publicationDate = new Date(dateParts[0], 0, 1);
                }
              }
              
              // Set URL
              const url = work.URL || `https://doi.org/${doi}`;
              
              // Set keywords
              const keywords = work.subject?.join(', ') || '';
              
              // Check if record already exists
              const existingRecord = await trx('metadata_records')
                .where({
                  doi,
                  provider,
                  institution_id: institutionId
                })
                .first();
              
              if (existingRecord) {
                continue;
              }
              
              // Insert new record
              await trx('metadata_records').insert({
                id: uuidv4(),
                record_id: doi, // Use DOI as record ID for seeded entries
                institution_id: institutionId,
                provider,
                title,
                abstract,
                authors: JSON.stringify(authors),
                publication_date: publicationDate,
                doi,
                url,
                is_open_access: work.is_open_access || false,
                keywords,
                additional_metadata: JSON.stringify(work),
                harvested_at: new Date(),
                created_at: new Date(),
                updated_at: new Date()
              });
            } catch (error) {
              this.logger.error('Error processing Crossref record', { error, doi: work.DOI });
            }
          }
        });
      }
      
      this.logger.info('Initial metadata seeding completed', { 
        institutionId, 
        provider,
        seedCount: works.length
      });
    } catch (error) {
      this.logger.error('Error seeding initial metadata', { error, institutionId, provider });
      throw error;
    }
  }
}