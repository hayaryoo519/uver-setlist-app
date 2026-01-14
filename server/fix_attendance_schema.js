const db = require('./db');

async function fixSchema() {
    try {
        console.log("Adding created_at column to attendance table...");
        await db.query("ALTER TABLE attendance ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
        console.log("Success!");
    } catch (err) {
        console.error("Error updating schema:", err.message);
    } finally {
        process.exit();
    }
}

fixSchema();
