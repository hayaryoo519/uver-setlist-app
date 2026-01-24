const db = require('./db');

async function migrate() {
    try {
        console.log('Starting migration...');

        await db.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS verification_token TEXT;
        `);

        console.log('Migration successful: Added verification columns to users table.');

        // Optional: verify existing users to avoid locking them out
        await db.query(`UPDATE users SET is_verified = TRUE WHERE is_verified IS FALSE`);
        console.log('Updated existing users to be verified.');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit();
    }
}

migrate();
