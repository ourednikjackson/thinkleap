// /db/migrations/20250224101010_password_resets.js
exports.up = function(knex) {
    return knex.schema
      .createTable('password_resets', function(table) {
        table.uuid('id').primary();
        table.uuid('user_id').references('id').inTable('users').unique();
        table.string('reset_token').notNullable();
        table.timestamp('expires_at').notNullable();
        table.timestamps(true, true);
      });
  };
  
  exports.down = function(knex) {
    return knex.schema
      .dropTable('password_resets');
  };