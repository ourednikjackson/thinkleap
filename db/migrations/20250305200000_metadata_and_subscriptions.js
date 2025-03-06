exports.up = function(knex) {
  return knex.schema
    // Create the library catalog metadata table
    .createTable('metadata_records', function(table) {
      table.uuid('id').primary();
      table.string('record_id').notNullable();  // Original ID from source system
      table.uuid('institution_id').references('id').inTable('institutions').onDelete('CASCADE');
      table.string('provider').notNullable();  // e.g., 'JSTOR', 'ProQuest', etc.
      table.string('title').notNullable();
      table.text('abstract');
      table.jsonb('authors');
      table.date('publication_date');
      table.string('doi');
      table.string('url');
      table.boolean('is_open_access').defaultTo(false);
      table.text('keywords');
      table.jsonb('additional_metadata');  // For any other metadata
      table.timestamp('harvested_at').notNullable();
      table.timestamps(true, true);
      
      // Create indexes
      table.index('institution_id');
      table.index('provider');
      table.index('doi');
      table.index(['institution_id', 'record_id', 'provider'], 'idx_metadata_composite');
      table.unique(['record_id', 'provider', 'institution_id']);
    })
    // Create the institutional subscriptions table
    .createTable('institutional_subscriptions', function(table) {
      table.uuid('id').primary();
      table.uuid('institution_id').references('id').inTable('institutions').onDelete('CASCADE');
      table.string('provider').notNullable();  // e.g., 'JSTOR', 'ProQuest', etc.
      table.string('subscription_level').notNullable();  // e.g., 'Basic', 'Premium', etc.
      table.jsonb('access_details');  // Collection IDs, resource limits, etc.
      table.date('start_date').notNullable();
      table.date('end_date');
      table.boolean('active').defaultTo(true);
      table.timestamps(true, true);
      
      // Create indexes
      table.index('institution_id');
      table.unique(['institution_id', 'provider']);
    })
    // Create the OAI-PMH harvesting source configuration table
    .createTable('harvest_sources', function(table) {
      table.uuid('id').primary();
      table.uuid('institution_id').references('id').inTable('institutions').onDelete('CASCADE');
      table.string('provider').notNullable();
      table.string('base_url').notNullable();
      table.string('metadata_prefix').notNullable().defaultTo('oai_dc');
      table.string('set_spec');
      table.timestamp('last_harvested_at');
      table.string('resumption_token');
      table.boolean('active').defaultTo(true);
      table.integer('batch_size').defaultTo(100);
      table.string('harvest_frequency').defaultTo('daily');
      table.timestamps(true, true);
      
      // Create indexes
      table.index('institution_id');
      table.unique(['institution_id', 'provider', 'base_url', 'set_spec']);
    })
    // Create the user access tracking table
    .createTable('user_access_logs', function(table) {
      table.uuid('id').primary();
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.uuid('institution_id').references('id').inTable('institutions');
      table.uuid('metadata_record_id').references('id').inTable('metadata_records');
      table.string('access_type').notNullable();  // e.g., 'view', 'download', etc.
      table.timestamp('accessed_at').defaultTo(knex.fn.now()).notNullable();
      
      // Create indexes
      table.index('user_id');
      table.index('metadata_record_id');
      table.index('institution_id');
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTable('user_access_logs')
    .dropTable('harvest_sources')
    .dropTable('institutional_subscriptions')
    .dropTable('metadata_records');
};