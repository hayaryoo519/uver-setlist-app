const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
});

async function runMigrations() {
    const client = await pool.connect();
    try {
        console.log('Running migrations...');
        const migrationDir = path.join(__dirname, '../migrations');
        const files = fs.readdirSync(migrationDir).filter(f => f.endsWith('.sql')).sort();

        for (const file of files) {
            console.log(`Executing ${file}...`);
            const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
            await client.query(sql);
            console.log(`Executed ${file}`);
        }
        console.log('All migrations completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigrations();
