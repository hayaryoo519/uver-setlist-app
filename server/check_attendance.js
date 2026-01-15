const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 54332,
    user: 'postgres',
    password: 'postgres',
    database: 'uver_app_db'
});

async function checkAttendance() {
    try {
        const result = await pool.query(`
            SELECT 
                u.id as user_id,
                u.email,
                l.id as live_id,
                l.title,
                l.date,
                a.created_at
            FROM users u
            JOIN attendance a ON u.id = a.user_id
            JOIN lives l ON a.live_id = l.id
            ORDER BY u.email, l.date DESC
        `);

        console.log('=== All Attendance Records ===');
        console.log(`Total: ${result.rows.length} records\n`);

        result.rows.forEach(row => {
            console.log(`User: ${row.email} (ID: ${row.user_id})`);
            console.log(`  Live: ${row.title || row.date} (ID: ${row.live_id})`);
            console.log(`  Recorded at: ${row.created_at}`);
            console.log('');
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
}

checkAttendance();
