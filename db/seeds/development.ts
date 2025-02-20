// db/seeds/development.ts
import { db } from '../../backend/src/services/database/connection';
import { hashPassword } from '../../backend/src/services/auth/auth.service';

async function seedDevelopment() {
  try {
    // Create test user
    const passwordHash = await hashPassword('test123');
    await db.query(`
      INSERT INTO users (email, password_hash, full_name, email_verified)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO NOTHING
    `, ['test@example.com', passwordHash, 'Test User', true]);

    // Add other development seed data as needed

    console.log('Development seed completed');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

seedDevelopment().catch(console.error);