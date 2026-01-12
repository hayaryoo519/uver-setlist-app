const db = require('./db');

async function migrate() {
    try {
        console.log("Adding 'title' column to 'lives' table...");
        await db.query(`
            ALTER TABLE lives 
            ADD COLUMN IF NOT EXISTS title VARCHAR(255);
        `);
        console.log("Migration successful!");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migrate();
