// db/seeds/development.js
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

exports.seed = async function(knex) {
  try {
    // Clear existing data for tables that might have foreign key constraints
    await knex('password_resets').del().catch(() => {});
    await knex('institution_verifications').del().catch(() => {});
    await knex('user_sessions').del().catch(() => {});
    await knex('saved_searches').del().catch(() => {});
    await knex('audit_logs').del().catch(() => {});
    await knex('user_preferences').del().catch(() => {});
    await knex('subscriptions').del().catch(() => {});
    
    // Clear the users table last
    await knex('users').del();
    
    // Create password hash
    const passwordHash = bcrypt.hashSync('test123', 10);
    
    // Insert test user
    await knex('users').insert({
      id: uuidv4(),
      email: 'test@example.com',
      password_hash: passwordHash,
      name: 'Test User',
      email_verified: true,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    console.log('Development seed completed');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}