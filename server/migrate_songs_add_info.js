const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME, // Note: .env uses DB_NAME
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function migrate() {
    try {
        console.log('Migrating songs table...');

        // Add album column
        await pool.query(`
      ALTER TABLE songs 
      ADD COLUMN IF NOT EXISTS album VARCHAR(255),
      ADD COLUMN IF NOT EXISTS release_year INTEGER,
      ADD COLUMN IF NOT EXISTS mv_url VARCHAR(255),
      ADD COLUMN IF NOT EXISTS author VARCHAR(255);
    `);

        console.log('Migration complete: Added album, release_year, mv_url, author to songs.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
