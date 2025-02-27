// db/seeds/test/01_users.js
exports.seed = async function(knex) {
    // Clear existing data first
    await knex('password_resets').del().catch(() => {});
    await knex('institution_verifications').del().catch(() => {});
    await knex('users').del();
    
    // Insert test user
    return knex('users').insert([
      {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'test@example.com',
        password_hash: '$2a$10$XpJJGAVYJz7t2QrW95jxDO7bs1DOxf3URXA6CDL/TSQUn5RIIF5M.', // 'password123'
        name: 'Test User',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  };