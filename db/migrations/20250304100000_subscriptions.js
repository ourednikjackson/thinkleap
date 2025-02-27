exports.up = function(knex) {
    return knex.schema
      .createTable('subscriptions', function(table) {
        table.uuid('id').primary();
        table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
        table.string('stripe_customer_id');
        table.string('stripe_subscription_id');
        table.string('plan_type', 50).notNullable();
        table.string('status', 50).notNullable();
        table.timestamp('current_period_start').notNullable();
        table.timestamp('current_period_end').notNullable();
        table.timestamps(true, true);
        
        // Create index
        table.index('user_id');
      });
  };
  
  exports.down = function(knex) {
    return knex.schema
      .dropTable('subscriptions');
  };