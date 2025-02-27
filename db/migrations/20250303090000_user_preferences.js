exports.up = function(knex) {
    return knex.schema
      .table('users', function(table) {
        table.timestamp('last_login');
        table.string('status', 20).defaultTo('active');
        table.string('account_type', 20).defaultTo('standard');
        table.jsonb('preferences').defaultTo('{}');
        table.boolean('email_verified').defaultTo(false);
        table.string('email_verification_token');
        table.timestamp('email_verification_expires');
        table.integer('failed_login_attempts').defaultTo(0);
        table.timestamp('last_failed_login');
        table.boolean('account_locked').defaultTo(false);
        table.string('password_reset_token');
        table.timestamp('password_reset_expires');
      });
  };
  
  exports.down = function(knex) {
    return knex.schema
      .table('users', function(table) {
        table.dropColumn('last_login');
        table.dropColumn('status');
        table.dropColumn('account_type');
        table.dropColumn('preferences');
        table.dropColumn('email_verified');
        table.dropColumn('email_verification_token');
        table.dropColumn('email_verification_expires');
        table.dropColumn('failed_login_attempts');
        table.dropColumn('last_failed_login');
        table.dropColumn('account_locked');
        table.dropColumn('password_reset_token');
        table.dropColumn('password_reset_expires');
      });
  };