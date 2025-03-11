/* eslint-disable @typescript-eslint/no-explicit-any */
import { OaiPmh, Record } from 'oai-pmh';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../database/database.service';
import { Logger } from '../logger';
import type { LogContext } from '../logger';
import { CustomError } from '../../errors/customError';

// Define Crossref API response types
interface CrossrefAuthor {
  given?: string;
  family?: string;
}

interface CrossrefDateParts {
  'date-parts': number[][];
}

interface CrossrefMessage {
  title?: string[];
  abstract?: string;
  author?: CrossrefAuthor[];
  published?: CrossrefDateParts;
  publisher?: string;
  subject?: string[];
  URL?: string;
  type?: string;
  'container-title'?: string[];
  ISSN?: string[];
  issue?: string;
  volume?: string;
  page?: string;
}

interface CrossrefResponse {
  message: CrossrefMessage;
}


interface HarvestOptions {
  fromDate?: Date;
  untilDate?: Date;
  metadataPrefix?: string;
  set?: string;
  batchSize?: number;
}

interface HarvestResult {
  recordsHarvested: number;
  recordsUpdated: number;
  recordsFailed: number;
  errors: string[];
}

export class OaiPmhService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly logger: Logger
  ) {}
  
  async harvestFromClient(clientId: string, options: HarvestOptions = {}): Promise<HarvestResult> {
    try {
      // Get client details including OAI-PMH endpoint
      const client = await this.databaseService.getClientById(clientId);
      
      if (!client) {
        throw new CustomError('NOT_FOUND', `Client with ID ${clientId} not found`);
      }
      
      if (!client.oai_endpoint) {
        throw new CustomError('VALIDATION_ERROR', `Client ${client.name} does not have an OAI-PMH endpoint configured`);
      }
      
      // Create log entry
      const logId = uuidv4();
      await this.databaseService.createHarvestingLog({
        id: logId,
        clientId,
        sourceProvider: 'oai-pmh',
        harvestType: 'oai-pmh',
        startedAt: new Date(),
        recordsHarvested: 0,
        recordsUpdated: 0,
        recordsFailed: 0
      });
      
      // Create OAI-PMH client
      const oaiPmh = new OaiPmh(client.oai_endpoint);
      
      // Set default options
      const metadataPrefix = options.metadataPrefix || 'oai_dc';
      const batchSize = options.batchSize || 100;
      
      // Initialize result counters
      let recordsHarvested = 0;
      let recordsUpdated = 0;
      let recordsFailed = 0;
      const errors: string[] = [];
      
      try {
        // Get list of records using OAI-PMH ListRecords verb
        const records = oaiPmh.listRecords({
          metadataPrefix,
          from: options.fromDate ? options.fromDate.toISOString() : undefined,
          until: options.untilDate ? options.untilDate.toISOString() : undefined,
          set: options.set
        });
        
        // Process records in batches
        let batch: Record[] = [];
        
        // Convert to array since the library might not properly implement AsyncIterable
        const recordsArray = await records;
        for (const record of recordsArray) {
          try {
            batch.push(record);
            
            // Process batch when it reaches the specified size
            if (batch.length >= batchSize) {
              const processedCount = await this.processBatch(batch, clientId);
              recordsHarvested += processedCount.harvested;
              recordsUpdated += processedCount.updated;
              recordsFailed += processedCount.failed;
              
              batch = []; // Reset batch
              
              // Update log periodically
              await this.databaseService.updateHarvestingLog(logId, {
                recordsHarvested,
                recordsUpdated,
                recordsFailed
              });
            }
          } catch (error) {
            recordsFailed++;
            this.logger.error(`Error processing record from ${client.name}`, error as Error);
            errors.push((error as Error).message);
          }
        }
        
        // Process remaining records
        if (batch.length > 0) {
          const processedCount = await this.processBatch(batch, clientId);
          recordsHarvested += processedCount.harvested;
          recordsUpdated += processedCount.updated;
          recordsFailed += processedCount.failed;
        }
      } catch (error) {
        this.logger.error(`Error harvesting from ${client.name}`, error as Error);
        errors.push((error as Error).message);
        
        // Update log with error
        await this.databaseService.updateHarvestingLog(logId, {
          completedAt: new Date(),
          recordsHarvested,
          recordsUpdated,
          recordsFailed,
          errorMessage: (error as Error).message
        });
        
        throw error;
      }
      
      // Update log with final results
      await this.databaseService.updateHarvestingLog(logId, {
        completedAt: new Date(),
        recordsHarvested,
        recordsUpdated,
        recordsFailed,
        errorMessage: errors.length > 0 ? errors.join('\n') : null
      });
      
      return {
        recordsHarvested,
        recordsUpdated,
        recordsFailed,
        errors
      };
    } catch (error) {
      this.logger.error(`Failed to harvest OAI-PMH data for client ${clientId}`, error as Error);
      throw error;
    }
  }
  
  private async processBatch(records: Record[], clientId: string): Promise<{ harvested: number, updated: number, failed: number }> {
    let harvested = 0;
    let updated = 0;
    let failed = 0;
    
    const metadataRecords = [];
    
    for (const record of records) {
      try {
        const metadata = this.parseMetadata(record);
        
        if (metadata) {
          // Enhance metadata with DOI if available
          if (metadata.identifier && metadata.identifier.startsWith('doi:')) {
            const doi = metadata.identifier.substring(4);
            metadata.doi = doi;
            
            // Fetch additional metadata from Crossref
            try {
              const enrichedData = await this.fetchFromCrossref(doi);
              if (enrichedData) {
                // Merge enriched data with existing metadata
                Object.assign(metadata, enrichedData);
              }
            } catch (error) {
              this.logger.warn(`Failed to enrich metadata from Crossref for DOI ${doi}`, { errorMessage: (error as Error).message });
            }
          }
          
          // Add client info
          metadata.clientId = clientId;
          metadata.id = uuidv4();
          
          metadataRecords.push(metadata);
          harvested++;
        }
      } catch (error) {
        failed++;
        this.logger.error('Error parsing OAI-PMH record', error as Error);
      }
    }
    
    // Insert records in a transaction
    if (metadataRecords.length > 0) {
      try {
        await this.databaseService.batchInsertMetadata(metadataRecords);
      } catch (error) {
        failed += metadataRecords.length;
        harvested -= metadataRecords.length;
        this.logger.error('Error inserting metadata batch', error as Error);
        throw error;
      }
    }
    
    return { harvested, updated, failed };
  }
  
  private parseMetadata(record: Record): any {
    const metadata: any = {
      identifier: record.header.identifier,
      title: '',
      sourceProvider: 'oai-pmh',
      additionalData: {}
    };
    
    try {
      const recordData = record.metadata;
      
      // Handle different metadata formats
      if (recordData?.['dc:title'] || recordData?.title) {
        metadata.title = recordData['dc:title'] || recordData.title || 'Untitled';
        if (Array.isArray(metadata.title)) {
          metadata.title = metadata.title[0];
        }
      }
      
      if (recordData?.['dc:creator'] || recordData?.creator) {
        const creators = recordData['dc:creator'] || recordData.creator || [];
        metadata.authors = Array.isArray(creators) ? creators : [creators];
      }
      
      if (recordData?.['dc:description'] || recordData?.description) {
        metadata.abstract = recordData['dc:description'] || recordData.description;
        if (Array.isArray(metadata.abstract)) {
          metadata.abstract = metadata.abstract[0];
        }
      }
      
      if (recordData?.['dc:date'] || recordData?.date) {
        const date = recordData['dc:date'] || recordData.date;
        if (date) {
          try {
            metadata.publicationDate = new Date(Array.isArray(date) ? date[0] : date);
          } catch (e) {
            this.logger.warn(`Failed to parse date: ${date}`);
          }
        }
      }
      
      if (recordData?.['dc:publisher'] || recordData?.publisher) {
        metadata.publisher = recordData['dc:publisher'] || recordData.publisher;
        if (Array.isArray(metadata.publisher)) {
          metadata.publisher = metadata.publisher[0];
        }
      }
      
      if (recordData?.['dc:subject'] || recordData?.subject) {
        const subjects = recordData['dc:subject'] || recordData.subject || [];
        metadata.keywords = Array.isArray(subjects) ? subjects : [subjects];
      }
      
      if (recordData?.['dc:identifier'] || recordData?.identifier) {
        const identifiers = recordData['dc:identifier'] || recordData.identifier || [];
        const idArray = Array.isArray(identifiers) ? identifiers : [identifiers];
        
        // Look for DOI
        for (const id of idArray) {
          if (typeof id === 'string') {
            if (id.startsWith('doi:') || id.startsWith('https://doi.org/')) {
              metadata.doi = id.replace(/^(doi:|https:\/\/doi\.org\/)/, '');
            } else if (id.startsWith('http')) {
              metadata.url = id;
            }
          }
        }
      }
      
      // Store other fields in additionalData
      for (const key in recordData) {
        if (!['title', 'creator', 'description', 'date', 'publisher', 'subject', 'identifier'].includes(key.replace(/^dc:/, ''))) {
          metadata.additionalData[key] = recordData[key];
        }
      }
      
      return metadata;
    } catch (error) {
      this.logger.error('Error parsing OAI-PMH record metadata', error as Error);
      throw error;
    }
  }
  
  

  private async fetchFromCrossref(doi: string): Promise<any | null> {
    try {
      const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
      
      if (!response.ok) {
        throw new Error(`Crossref API responded with status: ${response.status}`);
      }
      
      const data = await response.json() as CrossrefResponse;
      
      if (!data.message) {
        return null;
      }
      
      const enrichedData: any = {};
      
      if (data.message.title && data.message.title.length) {
        enrichedData.title = data.message.title[0];
      }
      
      if (data.message.abstract) {
        enrichedData.abstract = data.message.abstract;
      }
      
      if (data.message.author && data.message.author.length) {
        enrichedData.authors = data.message.author.map((author: CrossrefAuthor) => {
          return `${author.given || ''} ${author.family || ''}`.trim();
        });
      }
      
      if (data.message.published) {
        const date = data.message.published;
        if (date['date-parts'] && date['date-parts'][0]) {
          enrichedData.publicationDate = new Date(
            date['date-parts'][0][0],
            (date['date-parts'][0][1] || 1) - 1,
            date['date-parts'][0][2] || 1
          );
        }
      }
      
      if (data.message.publisher) {
        enrichedData.publisher = data.message.publisher;
      }
      
      if (data.message.subject && data.message.subject.length) {
        enrichedData.keywords = data.message.subject;
      }
      
      if (data.message.URL) {
        enrichedData.url = data.message.URL;
      }
      
      enrichedData.additionalData = {
        ...enrichedData.additionalData,
        crossref: {
          type: data.message.type,
          container: data.message['container-title'],
          issn: data.message.ISSN,
          issue: data.message.issue,
          volume: data.message.volume,
          page: data.message.page
        }
      };
      
      return enrichedData;
    } catch (error) {
      this.logger.warn(`Failed to fetch metadata from Crossref for DOI ${doi}`, { errorMessage: (error as Error).message });
      return null;
    }
  }
  
  // Schedule periodic harvesting for all clients
  async scheduleHarvesting(intervalHours = 24): Promise<void> {
    this.logger.info(`Scheduling OAI-PMH harvesting every ${intervalHours} hours`);
    
    const harvestAll = async (): Promise<void> => {
      try {
        const clients = await this.databaseService.getClientsWithOaiEndpoint();
        
        for (const client of clients) {
          this.logger.info(`Starting scheduled harvest for client: ${client.name}`);
          
          try {
            // Get last successful harvest date
            const lastHarvest = await this.databaseService.getLastSuccessfulHarvest(client.id);
            const fromDate = lastHarvest ? new Date(lastHarvest.completed_at) : undefined;
            
            await this.harvestFromClient(client.id, { fromDate });
          } catch (error) {
            this.logger.error(`Scheduled harvest failed for client ${client.name}`, error as Error);
          }
        }
      } catch (error) {
        this.logger.error('Error in scheduled OAI-PMH harvesting', error as Error);
      }
    };
    
    // Run immediately
    harvestAll();
    
    // Schedule periodic execution
    setInterval(harvestAll, intervalHours * 60 * 60 * 1000);
    return Promise.resolve();
  }
}
