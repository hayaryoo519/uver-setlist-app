const db = require('./db');

const migrate = async () => {
    try {
        await db.query(`
            ALTER TABLE lives 
            ADD COLUMN title VARCHAR(255);
        `);
        console.log("Migration successful: Added 'title' column to 'lives' table.");
    } catch (err) {
        console.error("Migration failed:", err.message);
    } finally {
        process.exit();
    }
};

migrate();
