const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 54332, // Discovered port
    user: 'postgres',
    password: 'postgres',
    database: 'postgres' // Verifying default DB first
});

async function checkTables() {
    try {
        console.log("Checking tables in 'postgres' database on port 54332...");
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);
        console.log("Tables found:", res.rows.map(r => r.table_name));

        // Also check if uver_app_db exists
        const dbRes = await pool.query("SELECT datname FROM pg_database WHERE datname = 'uver_app_db'");
        if (dbRes.rows.length > 0) {
            console.log("Database 'uver_app_db' EXISTS.");
        } else {
            console.log("Database 'uver_app_db' DOES NOT exist.");
        }

    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        pool.end();
    }
}

checkTables();
