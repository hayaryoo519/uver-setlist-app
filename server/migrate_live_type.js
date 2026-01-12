const db = require('./db');

const migrate = async () => {
    try {
        await db.query(`
            ALTER TABLE lives 
            ADD COLUMN type VARCHAR(50) DEFAULT 'ONEMAN';
        `);
        console.log("Migration successful: Added 'type' column to 'lives' table.");
    } catch (err) {
        console.error("Migration failed:", err.message);
    } finally {
        // We can't easily close pool from here if it's imported from db.js as a singleton
        // So we just exit.
        process.exit();
    }
};

migrate();
