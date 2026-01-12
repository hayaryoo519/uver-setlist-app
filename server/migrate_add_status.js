const pool = require('./db');

const migrate = async () => {
    try {
        console.log("Adding 'status' column to lives table...");

        // Add status column with default 'FINISHED'
        await pool.query(`
            ALTER TABLE lives 
            ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'FINISHED';
        `);

        // Ensure index for performance if we filter by it
        // await pool.query(`CREATE INDEX IF NOT EXISTS idx_lives_status ON lives(status);`);

        console.log("Migration successful: Added status column.");
    } catch (err) {
        console.error("Migration failed:", err.message);
    } finally {
        // End process
        process.exit();
    }
};

migrate();
