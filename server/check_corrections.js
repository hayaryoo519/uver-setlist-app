const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME
});

const checkSchema = async () => {
    try {
        console.log("Checking corrections table schema...\n");

        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'corrections'
            ORDER BY ordinal_position;
        `);

        console.log("Corrections table columns:");
        console.table(result.rows);

        // Check indexes
        const indexResult = await pool.query(`
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = 'corrections';
        `);

        console.log("\nIndexes:");
        indexResult.rows.forEach(row => {
            console.log(`  - ${row.indexname}`);
        });

        // Check row count
        const countResult = await pool.query('SELECT COUNT(*) FROM corrections');
        console.log(`\nTotal rows: ${countResult.rows[0].count}`);

    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await pool.end();
    }
};

checkSchema();
