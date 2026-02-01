const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });


const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function createSecurityLogsTable() {
    const client = await pool.connect();
    try {
        console.log('Creating security_logs table...');

        await client.query(`
            CREATE TABLE IF NOT EXISTS security_logs (
                id SERIAL PRIMARY KEY,
                timestamp TIMESTAMP DEFAULT NOW(),
                event_type VARCHAR(50) NOT NULL,
                message TEXT,
                user_email VARCHAR(255),
                ip_address VARCHAR(45),
                details JSONB,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        console.log('✅ security_logs table created successfully');

        // Create indexes for better query performance
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_security_logs_timestamp 
            ON security_logs(timestamp DESC);
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_security_logs_event_type 
            ON security_logs(event_type);
        `);

        console.log('✅ Indexes created successfully');

        // Verify table structure
        const result = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'security_logs'
            ORDER BY ordinal_position;
        `);

        console.log('\nTable structure:');
        result.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type}`);
        });

        console.log('\n✅ Migration completed successfully!');

    } catch (err) {
        console.error('❌ Error creating security_logs table:', err);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run migration
createSecurityLogsTable()
    .then(() => {
        console.log('\nYou can now start logging security events.');
        process.exit(0);
    })
    .catch(err => {
        console.error('Migration failed:', err);
        process.exit(1);
    });
