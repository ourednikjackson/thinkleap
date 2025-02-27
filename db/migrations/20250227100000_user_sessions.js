exports.up = function(knex) {
    return knex.schema
      .createTable('user_sessions', function(table) {
        table.uuid('id').primary();
        table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
        table.text('device_info');
        table.string('ip_address', 45);
        table.timestamp('last_active');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        
        // Create index
        table.index('user_id');
      })
      .createTable('sessions', function(table) {
        table.uuid('id').primary();
        table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
        table.string('refresh_token').notNullable();
        table.timestamp('expires_at').notNullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        
        // Create unique constraint
        table.unique(['user_id', 'refresh_token']);
        
        // Create indexes
        table.index('user_id');
        table.index('refresh_token');
      });
  };
  
  exports.down = function(knex) {
    return knex.schema
      .dropTable('sessions')
      .dropTable('user_sessions');
  };