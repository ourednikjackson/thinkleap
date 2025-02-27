exports.up = function(knex) {
  return knex.schema
    .createTable('users', function(table) {
      table.uuid('id').primary();
      table.string('email').notNullable().unique();
      table.string('password_hash').notNullable();
      table.string('name').notNullable();
      table.string('stripe_customer_id');
      table.string('subscription_id');
      table.timestamps(true, true);
    })
    .createTable('institution_verifications', function(table) {
      table.uuid('id').primary();
      table.uuid('user_id').references('id').inTable('users');
      table.string('institution_email').notNullable();
      table.string('verification_code').notNullable();
      table.timestamp('verified_at');
      table.timestamps(true, true);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTable('institution_verifications')
    .dropTable('users');
};