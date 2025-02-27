// db/seeds/development.ts
import { db } from '../../backend/src/services/database/connection';
import { AuthService } from '../../backend/src/services/auth/auth.service';
import { ValidationService } from '../../backend/src/services/validation/validation.service';
import { DatabaseService } from '../../backend/src/services/database/database.service';
import { config1 } from '../../backend/src/config';

const dbConfig = {
  user: config1.db.user || process.env.DB_USER || 'postgres',
  host: config1.db.host || process.env.DB_HOST || 'localhost',
  database: config1.db.name || process.env.DB_NAME || 'thinkleap', // Use name from config1 or env
  password: config1.db.password || process.env.DB_PASSWORD || 'postgres',
  port: config1.db.port || parseInt(process.env.DB_PORT || '5432', 10),
  // Only use environment variable for SSL since config1.db.ssl does not exist
  ssl: process.env.DB_SSL === 'true'
};

async function seedDevelopment() {
  try {
    // Create services
    const validationService = new ValidationService();
    const databaseService = new DatabaseService(dbConfig);
    const authService = new AuthService(validationService, databaseService);
    
    // Create test user
    const passwordHash = await authService.hashPassword('test123');
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