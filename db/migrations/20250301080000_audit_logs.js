exports.up = function(knex) {
    return knex.schema
      .createTable('audit_logs', function(table) {
        table.uuid('id').primary();
        table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
        table.string('action').notNullable();
        table.jsonb('details');
        table.string('ip_address', 45);
        table.text('user_agent');
        table.jsonb('search_details');
        table.string('search_type', 50);
        table.timestamp('created_at').defaultTo(knex.fn.now());
        
        // Create indexes
        table.index('user_id');
        table.index('created_at');
        table.index('search_type');
      });
  };
  
  exports.down = function(knex) {
    return knex.schema
      .dropTable('audit_logs');
  };