exports.up = function(knex) {
    return knex.schema
      .createTable('saved_searches', function(table) {
        table.uuid('id').primary();
        table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
        table.string('name').notNullable();
        table.text('description');
        table.text('query').notNullable();
        table.jsonb('filters').defaultTo('{}');
        table.timestamp('last_executed_at');
        table.integer('execution_count').defaultTo(0);
        table.timestamps(true, true);
        table.unique(['user_id', 'name']);
      })
      .createTable('saved_search_executions', function(table) {
        table.uuid('id').primary();
        table.uuid('saved_search_id').references('id').inTable('saved_searches').onDelete('CASCADE');
        table.integer('results_count').notNullable();
        table.integer('execution_time_ms').notNullable();
        table.timestamp('executed_at').defaultTo(knex.fn.now());
      });
  };
  
  exports.down = function(knex) {
    return knex.schema
      .dropTable('saved_search_executions')
      .dropTable('saved_searches');
  };