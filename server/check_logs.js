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

async function checkLogs() {
    const client = await pool.connect();
    try {
        console.log('Checking security_logs table...\n');

        const result = await client.query(`
            SELECT 
                id,
                timestamp,
                event_type,
                message,
                user_email,
                ip_address
            FROM security_logs
            ORDER BY timestamp DESC
            LIMIT 10
        `);

        if (result.rows.length === 0) {
            console.log('No logs found.');
        } else {
            console.log(`Found ${result.rows.length} log(s):\n`);
            result.rows.forEach((log, index) => {
                console.log(`--- Log #${index + 1} ---`);
                console.log(`ID: ${log.id}`);
                console.log(`Time: ${log.timestamp}`);
                console.log(`Type: ${log.event_type}`);
                console.log(`Message: ${log.message}`);
                console.log(`Email: ${log.user_email || 'N/A'}`);
                console.log(`IP: ${log.ip_address || 'N/A'}`);
                console.log('');
            });
        }

    } catch (err) {
        console.error('Error checking logs:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

checkLogs();
