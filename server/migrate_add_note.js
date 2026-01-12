const { pool } = require('./db');

async function migrate() {
    console.log("Migrating: Adding note column to setlists table...");
    try {
        await pool.query("ALTER TABLE setlists ADD COLUMN IF NOT EXISTS note VARCHAR(255);");
        console.log("Migration successful: note added.");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        process.exit();
    }
}

migrate();
