exports.up = function(knex) {
  return knex.schema
    .createTable('clients', function(table) {
      table.uuid('id').primary();
      table.string('name').notNullable();
      table.string('domain').notNullable().unique();
      table.boolean('is_federated').defaultTo(false);
      table.string('idp_entity_id');
      table.text('idp_metadata');
      table.text('idp_certificate');
      table.string('oai_endpoint');
      table.jsonb('subscriptions').defaultTo('{}');
      table.timestamps(true, true);
    })
    .createTable('saml_sessions', function(table) {
      table.uuid('id').primary();
      table.uuid('user_id').references('id').inTable('users');
      table.uuid('client_id').references('id').inTable('clients');
      table.string('session_index').notNullable();
      table.timestamp('expires_at').notNullable();
      table.timestamps(true, true);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTable('saml_sessions')
    .dropTable('clients');
};
