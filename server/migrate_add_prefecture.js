const { pool } = require('./db');

async function migrate() {
    console.log("Migrating: Adding prefecture column to lives table...");
    try {
        await pool.query("ALTER TABLE lives ADD COLUMN IF NOT EXISTS prefecture VARCHAR(255);");
        console.log("Migration successful: prefecture added.");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        process.exit();
    }
}

migrate();
