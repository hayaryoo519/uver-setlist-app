const { pool } = require('./db');

async function updateUsersTable() {
    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            console.log('Adding is_verified column...');
            await client.query(`
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
            `);

            console.log('Adding verification_token column...');
            await client.query(`
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255);
            `);

            await client.query('COMMIT');
            console.log('Users table updated successfully.');
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Error updating users table:', err);
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Error connecting to database:', err);
    } finally {
        await pool.end();
    }
}

updateUsersTable();
