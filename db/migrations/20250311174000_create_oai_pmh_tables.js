/**
 * Create OAI-PMH related tables
 */

exports.up = async function(knex) {
  // Create UUID extension if not exists
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  // Create table for OAI-PMH sources
  await knex.schema.createTable('oai_pmh_sources', (table) => {
    table.uuid('id').defaultTo(knex.raw('uuid_generate_v4()')).primary();
    table.string('name').notNullable().comment('Human-readable name of the source');
    table.string('oai_endpoint').notNullable().comment('OAI-PMH endpoint URL');
    table.string('metadata_prefix').defaultTo('oai_dc').comment('Metadata format prefix (e.g., oai_dc, marc21)');
    table.specificType('filter_providers', 'text[]').defaultTo('{jstor}').comment('Providers to filter for');
    table.string('harvest_frequency').defaultTo('0 0 * * 0').comment('Cron expression for harvest schedule');
    table.timestamp('last_harvested').nullable().comment('Timestamp of last successful harvest');
    table.string('status').defaultTo('active').comment('Status of the source (active, paused, error)');
    table.jsonb('settings').defaultTo('{}').comment('Additional source-specific settings');
    table.timestamps(true, true);
  });

  // Create table for harvested metadata
  await knex.schema.createTable('harvested_metadata', (table) => {
    table.uuid('id').defaultTo(knex.raw('uuid_generate_v4()')).primary();
    table.string('provider').notNullable().index().comment('Content provider (e.g., jstor, proquest)');
    table.string('record_id').notNullable().comment('Original record identifier');
    table.text('title').notNullable().comment('Article title');
    table.jsonb('authors').defaultTo('[]').comment('Authors as JSON array');
    table.text('abstract').nullable().comment('Article abstract');
    table.date('publication_date').nullable().comment('Publication date');
    table.string('journal').nullable().comment('Journal or publication name');
    table.text('url').nullable().comment('URL to original article');
    table.string('doi').nullable().comment('DOI if available');
    table.specificType('keywords', 'text[]').defaultTo('{}').comment('Keywords or subjects');
    table.uuid('source_id').references('id').inTable('oai_pmh_sources').onDelete('SET NULL').comment('Source that provided this record');
    table.jsonb('full_metadata').defaultTo('{}').comment('Complete original metadata');
    table.timestamps(true, true);

    // Create unique constraint on provider and record_id
    table.unique(['provider', 'record_id']);
  });

  // Create table for harvest logs
  await knex.schema.createTable('harvest_logs', (table) => {
    table.uuid('id').defaultTo(knex.raw('uuid_generate_v4()')).primary();
    table.uuid('source_id').references('id').inTable('oai_pmh_sources').onDelete('CASCADE');
    table.timestamp('started_at').notNullable();
    table.timestamp('completed_at').nullable();
    table.string('status').defaultTo('running').comment('Status: running, completed, failed');
    table.integer('records_processed').defaultTo(0);
    table.integer('records_added').defaultTo(0);
    table.integer('records_updated').defaultTo(0);
    table.integer('records_failed').defaultTo(0);
    table.text('error_message').nullable();
    table.jsonb('details').defaultTo('{}');
    table.timestamps(true, true);
  });

  // Create indices for efficient searches
  await knex.raw(`
    CREATE INDEX idx_harvested_metadata_title_fts ON harvested_metadata USING GIN (to_tsvector('english', title));
    CREATE INDEX idx_harvested_metadata_abstract_fts ON harvested_metadata USING GIN (to_tsvector('english', abstract));
    CREATE INDEX idx_harvested_metadata_publication_date ON harvested_metadata (publication_date);
    CREATE INDEX idx_harvested_metadata_doi ON harvested_metadata (doi) WHERE doi IS NOT NULL;
  `);
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('harvest_logs');
  await knex.schema.dropTableIfExists('harvested_metadata');
  await knex.schema.dropTableIfExists('oai_pmh_sources');
};
