exports.up = function(knex) {
  return knex.schema
    // Create the institutions table
    .createTable('institutions', function(table) {
      table.uuid('id').primary();
      table.string('name').notNullable();
      table.string('domain').notNullable().unique();
      table.boolean('active').defaultTo(true);
      table.timestamps(true, true);
    })
    // Create the SAML identity providers table
    .createTable('saml_identity_providers', function(table) {
      table.uuid('id').primary();
      table.uuid('institution_id').references('id').inTable('institutions').onDelete('CASCADE');
      table.string('entity_id').notNullable();
      table.text('certificate').notNullable();
      table.string('sso_login_url').notNullable();
      table.string('sso_logout_url');
      table.boolean('is_federated').defaultTo(false);
      table.string('federation_name');
      table.timestamps(true, true);
      
      // Create indexes
      table.index('institution_id');
      table.unique(['institution_id', 'entity_id']);
    })
    // Create user to institution mapping
    .createTable('user_institutions', function(table) {
      table.uuid('id').primary();
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.uuid('institution_id').references('id').inTable('institutions').onDelete('CASCADE');
      table.string('institutional_email');
      table.boolean('is_primary').defaultTo(false);
      table.timestamps(true, true);
      
      // Create indexes
      table.index('user_id');
      table.index('institution_id');
      table.unique(['user_id', 'institution_id']);
    })
    // Add institutional user ID to user sessions
    .alterTable('user_sessions', function(table) {
      table.uuid('institution_id').references('id').inTable('institutions');
      table.string('saml_session_index');
      table.string('saml_name_id');
    });
};

exports.down = function(knex) {
  return knex.schema
    .alterTable('user_sessions', function(table) {
      table.dropColumn('saml_name_id');
      table.dropColumn('saml_session_index');
      table.dropColumn('institution_id');
    })
    .dropTable('user_institutions')
    .dropTable('saml_identity_providers')
    .dropTable('institutions');
};