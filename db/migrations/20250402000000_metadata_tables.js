exports.up = function(knex) {
  return knex.schema
    .createTable('metadata', function(table) {
      table.uuid('id').primary();
      table.string('identifier').notNullable().index();
      table.string('title').notNullable().index();
      table.text('abstract');
      table.jsonb('authors').defaultTo('[]');
      table.string('doi').index();
      table.string('url');
      table.date('publication_date');
      table.string('publisher');
      table.jsonb('keywords').defaultTo('[]');
      table.string('source_provider').notNullable().index();
      table.uuid('client_id').references('id').inTable('clients').index();
      table.jsonb('additional_data').defaultTo('{}');
      table.timestamps(true, true);
      
      // Create a composite index for efficient searching
      table.index(['title', 'source_provider', 'client_id']);
    })
    .createTable('harvesting_logs', function(table) {
      table.uuid('id').primary();
      table.uuid('client_id').references('id').inTable('clients');
      table.string('source_provider').notNullable();
      table.string('harvest_type').notNullable(); // 'oai-pmh', 'crossref', 'user-access'
      table.timestamp('started_at').notNullable();
      table.timestamp('completed_at');
      table.integer('records_harvested').defaultTo(0);
      table.integer('records_updated').defaultTo(0);
      table.integer('records_failed').defaultTo(0);
      table.text('error_message');
      table.jsonb('additional_info').defaultTo('{}');
      table.timestamps(true, true);
    })
    .createTable('user_access_logs', function(table) {
      table.uuid('id').primary();
      table.uuid('user_id').references('id').inTable('users');
      table.uuid('client_id').references('id').inTable('clients');
      table.string('resource_url').notNullable();
      table.string('resource_doi');
      table.string('resource_title');
      table.timestamp('accessed_at').notNullable();
      table.timestamps(true, true);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTable('user_access_logs')
    .dropTable('harvesting_logs')
    .dropTable('metadata');
};
