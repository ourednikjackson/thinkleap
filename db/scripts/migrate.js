// db/scripts/migrate.js
console.log('Starting database migration...');
console.log('Current working directory:', process.cwd());
console.log('Script directory:', __dirname);

const path = require('path');
const { Pool } = require('pg');
// Update the dotenv config line to look in project root
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
console.log('Environment variables loaded:', {
    hasEnvFile: require('dotenv').config().error === undefined,
    dbUser: process.env.DB_USER || 'not set',
    dbHost: process.env.DB_HOST || 'not set',
    dbName: process.env.DB_NAME || 'not set',
    // Don't log actual password, just whether it exists
    hasPassword: !!process.env.DB_PASSWORD,
    passwordType: typeof process.env.DB_PASSWORD
  });
console.log('Database configuration:', {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    // Don't log the actual password, just check if it exists
    hasPassword: !!process.env.DB_PASSWORD
  });
const fs = require('fs').promises;

async function migrate() {
  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

  try {
    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Read migration files
    const migrationsDir = path.join(__dirname, '../migrations');
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

    // Execute migrations in transaction
    for (const file of sqlFiles) {
      const result = await pool.query(
        'SELECT id FROM migrations WHERE name = $1',
        [file]
      );

      if (result.rows.length === 0) {
        const sql = await fs.readFile(
          path.join(migrationsDir, file),
          'utf-8'
        );

        await pool.query('BEGIN');
        try {
          await pool.query(sql);
          await pool.query(
            'INSERT INTO migrations (name) VALUES ($1)',
            [file]
          );
          await pool.query('COMMIT');
          console.log(`Migrated: ${file}`);
        } catch (error) {
          await pool.query('ROLLBACK');
          throw error;
        }
      }
    }
  } finally {
    await pool.end();
  }
}

migrate().catch(console.error);