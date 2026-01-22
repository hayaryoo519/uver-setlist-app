const pool = require('./db');

const migrate = async () => {
    try {
        console.log('Adding suggested_data column to corrections table...');

        // Add suggested_data column
        await pool.query(`
            ALTER TABLE corrections 
            ADD COLUMN IF NOT EXISTS suggested_data JSONB;
        `);

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
};

migrate();
