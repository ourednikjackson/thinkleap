import { db } from './services/database/connection';

async function testConnection() {
    try {
        const result = await db.query('SELECT NOW()');
        console.log(result);
    } catch (error) {
        console.error('Connection error:', error);
    }
}

testConnection();