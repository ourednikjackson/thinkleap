import { OaiPmh, Record } from 'oai-pmh';
import { db } from '../../db';
import { logger } from '../../utils/logger';

interface OaiPmhSourceConfig {
  id: string;
  name: string;
  oai_endpoint: string;
  metadata_prefix: string;
  filter_providers: string[];
  status: string;
}

interface HarvestedRecord {
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
}

export class OaiPmhHarvester {
  private sourceConfig: OaiPmhSourceConfig;
  private client: OaiPmh;
  private currentLogId: string | null = null;
  private stats = {
    recordsProcessed: 0,
    recordsAdded: 0,
    recordsUpdated: 0,
    recordsFailed: 0
  };
  private asyncIteratorWrapper: <T>(promiseArray: Promise<T[]>) => AsyncIterable<T>;

  constructor(sourceConfig: OaiPmhSourceConfig) {
    this.sourceConfig = sourceConfig;
    this.client = new OaiPmh(sourceConfig.oai_endpoint);
    
    // Create an async iterator wrapper for promises that return arrays
    this.asyncIteratorWrapper = <T>(promiseArray: Promise<T[]>): AsyncIterable<T> => {
      return {
        [Symbol.asyncIterator]: async function* () {
          const array = await promiseArray;
          for (const item of array) {
            yield item;
          }
        }
      };
    };
  }

  /**
   * Start a full harvest from this OAI-PMH source
   */
  async harvestAll(): Promise<void> {
    await this.startHarvestLog();
    
    try {
      logger.info(`Starting full harvest from ${this.sourceConfig.name} (${this.sourceConfig.oai_endpoint})`);
      
      // Get all records using the ListRecords verb and wrap in our async iterator
      const recordsPromise = this.client.listRecords({
        metadataPrefix: this.sourceConfig.metadata_prefix
      });
      const records = this.asyncIteratorWrapper<Record>(recordsPromise);
      
      // Process records as they come in
      for await (const record of records) {
        await this.processRecord(record);
      }
      
      // Update the last harvested timestamp
      await db('oai_pmh_sources')
        .where({ id: this.sourceConfig.id })
        .update({ 
          last_harvested: new Date(),
          status: 'active'
        });
      
      await this.completeHarvestLog('completed');
      logger.info(`Completed harvest from ${this.sourceConfig.name}. Stats: `, this.stats);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error harvesting from ${this.sourceConfig.name}: ${errorMessage}`, error);
      
      // Update source status if there's a persistent error
      await db('oai_pmh_sources')
        .where({ id: this.sourceConfig.id })
        .update({ status: 'error' });
      
      await this.completeHarvestLog('failed', errorMessage);
      throw error;    }
  }

  /**
   * Start an incremental harvest from the last harvest date
   */
  async incrementalHarvest(): Promise<void> {
    const source = await db('oai_pmh_sources')
      .where({ id: this.sourceConfig.id })
      .first();
    
    if (!source.last_harvested) {
      // If no previous harvest, do a full harvest
      return this.harvestAll();
    }
    
    await this.startHarvestLog();
    
    try {
      const fromDate = new Date(source.last_harvested);
      logger.info(`Starting incremental harvest from ${this.sourceConfig.name} since ${fromDate.toISOString()}`);
      
      // Get records from the last harvest date
      const records = this.client.listRecords({
        metadataPrefix: this.sourceConfig.metadata_prefix,
        from: fromDate.toISOString().split('T')[0] // Use just the date part
      });
      
      // Process records as they come in
      for await (const record of records) {
        await this.processRecord(record);
      }
      
      // Update the last harvested timestamp
      await db('oai_pmh_sources')
        .where({ id: this.sourceConfig.id })
        .update({ 
          last_harvested: new Date(),
          status: 'active'
        });
      
      await this.completeHarvestLog('completed');
      logger.info(`Completed incremental harvest from ${this.sourceConfig.name}. Stats: `, this.stats);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error in incremental harvest from ${this.sourceConfig.name}: ${errorMessage}`, error);
      
      // Only update status to error if it's a persistent error, not just no new records
      if (error.message !== 'noRecordsMatch') {
        await db('oai_pmh_sources')
          .where({ id: this.sourceConfig.id })
          .update({ status: 'error' });
      }
      
      await this.completeHarvestLog(error.message === 'noRecordsMatch' ? 'completed' : 'failed', error.message);
      
      // Don't throw for "no records match" - that's a normal condition for incremental harvests
      if (error.message !== 'noRecordsMatch') {
        throw error;
      }
    }
  }

  /**
   * Process a single OAI-PMH record
   */
  private async processRecord(record: any): Promise<void> {
    this.stats.recordsProcessed++;
    
    try {
      // Extract metadata based on the format
      const metadata = this.extractMetadata(record);
      
      // Check if this is from a provider we're interested in (e.g., JSTOR)
      if (!this.isDesiredProvider(metadata)) {
        return; // Skip records that don't match our filter
      }
      
      // Check for duplicates and insert or update
      await this.deduplicateAndStore(metadata);
    } catch (error) {
      this.stats.recordsFailed++;
      logger.error(`Failed to process record: ${error.message}`, { 
        recordId: record.header?.identifier,
        error
      });
    }
  }

  /**
   * Extract standardized metadata from OAI-PMH record
   */
  private extractMetadata(record: any): HarvestedRecord {
    const header = record.header;
    const metadata = record.metadata;
    
    // Basic record info
    const result: HarvestedRecord = {
      provider: 'unknown',
      record_id: header.identifier,
      title: 'Untitled',
      authors: [],
      source_id: this.sourceConfig.id,
      full_metadata: metadata
    };
    
    // Process based on metadata format
    if (this.sourceConfig.metadata_prefix === 'oai_dc') {
      return this.extractDublinCoreMetadata(result, metadata);
    } else if (this.sourceConfig.metadata_prefix === 'marc21') {
      return this.extractMarcMetadata(result, metadata);
    } else {
      // Generic extraction - try to find common fields
      return this.extractGenericMetadata(result, metadata);
    }
  }

  /**
   * Extract metadata from Dublin Core format
   */
  private extractDublinCoreMetadata(base: HarvestedRecord, metadata: any): HarvestedRecord {
    try {
      const dc = metadata['oai_dc:dc'] || metadata['dc'];
      
      if (!dc) {
        logger.warn('Dublin Core metadata not found in expected format', { metadata });
        return base;
      }
      
      // Extract title
      if (dc['dc:title'] && dc['dc:title'].length > 0) {
        base.title = Array.isArray(dc['dc:title']) ? dc['dc:title'][0] : dc['dc:title'];
      }
      
      // Extract authors
      if (dc['dc:creator']) {
        const creators = Array.isArray(dc['dc:creator']) ? dc['dc:creator'] : [dc['dc:creator']];
        base.authors = creators.map(name => ({ name }));
      }
      
      // Extract abstract/description
      if (dc['dc:description'] && dc['dc:description'].length > 0) {
        base.abstract = Array.isArray(dc['dc:description']) 
          ? dc['dc:description'][0] 
          : dc['dc:description'];
      }
      
      // Extract date
      if (dc['dc:date'] && dc['dc:date'].length > 0) {
        const dateStr = Array.isArray(dc['dc:date']) ? dc['dc:date'][0] : dc['dc:date'];
        if (dateStr) {
          base.publication_date = new Date(dateStr);
        }
      }
      
      // Extract journal/source
      if (dc['dc:source'] && dc['dc:source'].length > 0) {
        base.journal = Array.isArray(dc['dc:source']) ? dc['dc:source'][0] : dc['dc:source'];
      }
      
      // Extract identifiers (URL, DOI)
      if (dc['dc:identifier']) {
        const identifiers = Array.isArray(dc['dc:identifier']) ? dc['dc:identifier'] : [dc['dc:identifier']];
        
        for (const id of identifiers) {
          // Check for DOI
          if (typeof id === 'string' && id.toLowerCase().includes('doi:')) {
            base.doi = id.replace(/^doi:/i, '').trim();
          }
          // Check for URL
          else if (typeof id === 'string' && id.startsWith('http')) {
            base.url = id;
            
            // Determine provider from URL
            if (id.includes('jstor.org')) {
              base.provider = 'jstor';
            } else if (id.includes('proquest.com')) {
              base.provider = 'proquest';
            }
          }
        }
      }
      
      // Extract subjects/keywords
      if (dc['dc:subject']) {
        base.keywords = Array.isArray(dc['dc:subject']) ? dc['dc:subject'] : [dc['dc:subject']];
      }
      
      return base;
    } catch (error) {
      logger.error('Error extracting Dublin Core metadata', { error, metadata });
      return base;
    }
  }

  /**
   * Extract metadata from MARC format
   */
  private extractMarcMetadata(base: HarvestedRecord, metadata: any): HarvestedRecord {
    // Basic extraction for MARC format - would need enhancement for production
    try {
      // In a real implementation, we'd use a MARC parsing library or more robust extraction
      // This is a simplified version for demonstration
      const record = metadata['marc:record'] || {};
      const fields = record['marc:datafield'] || [];
      
      // Process title (MARC field 245)
      const titleField = fields.find((f: any) => f.$.tag === '245');
      if (titleField && titleField['marc:subfield']) {
        const subfields = titleField['marc:subfield'].filter((sf: any) => ['a', 'b'].includes(sf.$.code));
        base.title = subfields.map((sf: any) => sf._).join(' ');
      }
      
      // Process authors (MARC fields 100, 700)
      const authorFields = fields.filter((f: any) => ['100', '700'].includes(f.$.tag));
      if (authorFields.length > 0) {
        base.authors = authorFields.map((field: any) => {
          const subfield = field['marc:subfield'].find((sf: any) => sf.$.code === 'a');
          return { name: subfield ? subfield._ : 'Unknown Author' };
        });
      }
      
      // Process abstract (MARC field 520)
      const abstractField = fields.find((f: any) => f.$.tag === '520');
      if (abstractField && abstractField['marc:subfield']) {
        const subfield = abstractField['marc:subfield'].find((sf: any) => sf.$.code === 'a');
        if (subfield) {
          base.abstract = subfield._;
        }
      }
      
      // Process date (MARC field 260$c)
      const pubField = fields.find((f: any) => f.$.tag === '260');
      if (pubField && pubField['marc:subfield']) {
        const dateSubfield = pubField['marc:subfield'].find((sf: any) => sf.$.code === 'c');
        if (dateSubfield) {
          // Extract year from string like "c2015" or "2015."
          const yearMatch = dateSubfield._.match(/\d{4}/);
          if (yearMatch) {
            base.publication_date = new Date(yearMatch[0]);
          }
        }
      }
      
      // Process journal (MARC field 773)
      const journalField = fields.find((f: any) => f.$.tag === '773');
      if (journalField && journalField['marc:subfield']) {
        const titleSubfield = journalField['marc:subfield'].find((sf: any) => sf.$.code === 't');
        if (titleSubfield) {
          base.journal = titleSubfield._;
        }
      }
      
      // Process identifiers (MARC fields 856, 024)
      const urlField = fields.find((f: any) => f.$.tag === '856');
      if (urlField && urlField['marc:subfield']) {
        const urlSubfield = urlField['marc:subfield'].find((sf: any) => sf.$.code === 'u');
        if (urlSubfield) {
          base.url = urlSubfield._;
          
          // Determine provider from URL
          if (base.url.includes('jstor.org')) {
            base.provider = 'jstor';
          }
        }
      }
      
      const doiField = fields.find((f: any) => f.$.tag === '024' && f.$.ind1 === '7');
      if (doiField && doiField['marc:subfield']) {
        const doiSubfield = doiField['marc:subfield'].find((sf: any) => sf.$.code === 'a');
        if (doiSubfield) {
          base.doi = doiSubfield._;
        }
      }
      
      // Process subjects (MARC fields 650, 651)
      const subjectFields = fields.filter((f: any) => ['650', '651'].includes(f.$.tag));
      if (subjectFields.length > 0) {
        base.keywords = subjectFields.map((field: any) => {
          const subfield = field['marc:subfield'].find((sf: any) => sf.$.code === 'a');
          return subfield ? subfield._ : '';
        }).filter(Boolean);
      }
      
      return base;
    } catch (error) {
      logger.error('Error extracting MARC metadata', { error, metadata });
      return base;
    }
  }

  /**
   * Extract metadata from any format by looking for common patterns
   */
  private extractGenericMetadata(base: HarvestedRecord, metadata: any): HarvestedRecord {
    // Try to extract by looking at common field names
    try {
      // First try to detect format and use specific extractor
      if (metadata['oai_dc:dc'] || metadata['dc']) {
        return this.extractDublinCoreMetadata(base, metadata);
      }
      if (metadata['marc:record']) {
        return this.extractMarcMetadata(base, metadata);
      }
      
      // Generic fallback
      const findValue = (obj: any, keys: string[]): any => {
        if (!obj) return null;
        
        for (const key of keys) {
          if (obj[key] !== undefined) {
            return obj[key];
          }
        }
        
        // Look one level deeper
        for (const prop in obj) {
          if (typeof obj[prop] === 'object' && obj[prop] !== null) {
            const result = findValue(obj[prop], keys);
            if (result) return result;
          }
        }
        
        return null;
      };
      
      // Try to find title
      const title = findValue(metadata, ['title', 'dc:title', 'Title']);
      if (title) {
        base.title = Array.isArray(title) ? title[0] : title;
      }
      
      // Try to find authors
      const authors = findValue(metadata, ['creator', 'dc:creator', 'author', 'authors', 'Author']);
      if (authors) {
        if (Array.isArray(authors)) {
          base.authors = authors.map(a => typeof a === 'string' ? { name: a } : a);
        } else if (typeof authors === 'string') {
          base.authors = [{ name: authors }];
        }
      }
      
      // Try to find abstract
      const abstract = findValue(metadata, ['description', 'dc:description', 'abstract', 'Abstract']);
      if (abstract) {
        base.abstract = Array.isArray(abstract) ? abstract[0] : abstract;
      }
      
      // Try to find date
      const date = findValue(metadata, ['date', 'dc:date', 'publicationDate', 'created']);
      if (date) {
        const dateStr = Array.isArray(date) ? date[0] : date;
        if (dateStr) {
          base.publication_date = new Date(dateStr);
        }
      }
      
      // Try to find journal
      const journal = findValue(metadata, ['source', 'dc:source', 'journal', 'Journal']);
      if (journal) {
        base.journal = Array.isArray(journal) ? journal[0] : journal;
      }
      
      // Try to find URL and DOI
      const identifiers = findValue(metadata, ['identifier', 'dc:identifier', 'url', 'doi']);
      if (identifiers) {
        const ids = Array.isArray(identifiers) ? identifiers : [identifiers];
        
        for (const id of ids) {
          if (typeof id === 'string') {
            if (id.toLowerCase().includes('doi:') || id.toLowerCase().includes('doi.org')) {
              base.doi = id.replace(/^doi:/i, '').replace('https://doi.org/', '').trim();
            } else if (id.startsWith('http')) {
              base.url = id;
              
              // Determine provider from URL
              if (id.includes('jstor.org')) {
                base.provider = 'jstor';
              }
            }
          }
        }
      }
      
      // Try to find keywords
      const keywords = findValue(metadata, ['subject', 'dc:subject', 'keywords', 'topics']);
      if (keywords) {
        base.keywords = Array.isArray(keywords) ? keywords : [keywords];
      }
      
      return base;
    } catch (error) {
      logger.error('Error extracting generic metadata', { error, metadata });
      return base;
    }
  }

  /**
   * Check if the record is from a provider we're interested in
   */
  private isDesiredProvider(metadata: HarvestedRecord): boolean {
    // If we don't know the provider yet, try to determine it from the URL
    if (metadata.provider === 'unknown' && metadata.url) {
      if (metadata.url.includes('jstor.org')) {
        metadata.provider = 'jstor';
      } else if (metadata.url.includes('proquest.com')) {
        metadata.provider = 'proquest';
      }
      // Add other provider checks as needed
    }
    
    // Check if this provider is in our filter list
    return this.sourceConfig.filter_providers.includes(metadata.provider);
  }

  /**
   * Check for duplicates and insert or update the record
   */
  private async deduplicateAndStore(metadata: HarvestedRecord): Promise<void> {
    try {
      // Check for existing record by DOI if available
      let existingRecord = null;
      
      if (metadata.doi) {
        existingRecord = await db('harvested_metadata')
          .where({ 
            provider: metadata.provider,
            doi: metadata.doi 
          })
          .first();
      }
      
      // If no match by DOI, try by record_id
      if (!existingRecord) {
        existingRecord = await db('harvested_metadata')
          .where({ 
            provider: metadata.provider,
            record_id: metadata.record_id 
          })
          .first();
      }
      
      if (existingRecord) {
        // Update existing record with potentially more complete information
        const mergedRecord = this.mergeRecords(existingRecord, metadata);
        
        await db('harvested_metadata')
          .where({ id: existingRecord.id })
          .update({
            title: mergedRecord.title,
            authors: JSON.stringify(mergedRecord.authors),
            abstract: mergedRecord.abstract,
            publication_date: mergedRecord.publication_date,
            journal: mergedRecord.journal,
            url: mergedRecord.url,
            doi: mergedRecord.doi,
            keywords: mergedRecord.keywords,
            full_metadata: JSON.stringify(mergedRecord.full_metadata),
            updated_at: new Date()
          });
        
        this.stats.recordsUpdated++;
      } else {
        // Insert new record
        await db('harvested_metadata').insert({
          provider: metadata.provider,
          record_id: metadata.record_id,
          title: metadata.title,
          authors: JSON.stringify(metadata.authors),
          abstract: metadata.abstract,
          publication_date: metadata.publication_date,
          journal: metadata.journal,
          url: metadata.url,
          doi: metadata.doi,
          keywords: metadata.keywords,
          source_id: metadata.source_id,
          full_metadata: JSON.stringify(metadata.full_metadata),
          created_at: new Date(),
          updated_at: new Date()
        });
        
        this.stats.recordsAdded++;
      }
    } catch (error) {
      this.stats.recordsFailed++;
      logger.error(`Failed to store record: ${error.message}`, { 
        record_id: metadata.record_id,
        error
      });
      throw error;
    }
  }

  /**
   * Merge two records, preferring the most complete information
   */
  private mergeRecords(existing: any, update: HarvestedRecord): HarvestedRecord {
    return {
      provider: existing.provider,
      record_id: existing.record_id,
      title: update.title || existing.title,
      authors: update.authors?.length ? update.authors : existing.authors,
      abstract: update.abstract || existing.abstract,
      publication_date: update.publication_date || existing.publication_date,
      journal: update.journal || existing.journal,
      url: update.url || existing.url,
      doi: update.doi || existing.doi,
      keywords: update.keywords?.length ? update.keywords : existing.keywords,
      source_id: existing.source_id,
      full_metadata: update.full_metadata || existing.full_metadata
    };
  }

  /**
   * Create a new harvest log entry
   */
  private async startHarvestLog(): Promise<void> {
    try {
      // Reset stats
      this.stats = {
        recordsProcessed: 0,
        recordsAdded: 0,
        recordsUpdated: 0,
        recordsFailed: 0
      };
      
      // Create log entry
      const [logId] = await db('harvest_logs').insert({
        source_id: this.sourceConfig.id,
        started_at: new Date(),
        status: 'running',
        details: JSON.stringify({
          endpoint: this.sourceConfig.oai_endpoint,
          metadataPrefix: this.sourceConfig.metadata_prefix
        }),
        created_at: new Date(),
        updated_at: new Date()
      }).returning('id');
      
      this.currentLogId = logId;
    } catch (error) {
      logger.error(`Failed to create harvest log: ${error.message}`, error);
    }
  }

  /**
   * Update the harvest log with completion status
   */
  private async completeHarvestLog(status: string, errorMessage?: string): Promise<void> {
    if (!this.currentLogId) return;
    
    try {
      await db('harvest_logs')
        .where({ id: this.currentLogId })
        .update({
          completed_at: new Date(),
          status,
          records_processed: this.stats.recordsProcessed,
          records_added: this.stats.recordsAdded,
          records_updated: this.stats.recordsUpdated,
          records_failed: this.stats.recordsFailed,
          error_message: errorMessage,
          details: JSON.stringify({
            ...JSON.parse((await db('harvest_logs').where({ id: this.currentLogId }).first()).details),
            stats: this.stats
          }),
          updated_at: new Date()
        });
    } catch (error) {
      logger.error(`Failed to update harvest log: ${error.message}`, error);
    }
  }
}
