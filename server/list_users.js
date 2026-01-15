const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 54332,
    user: 'postgres',
    password: 'postgres',
    database: 'uver_app_db'
});

async function listUsers() {
    try {
        const result = await pool.query('SELECT email, role FROM users');
        console.log('=== User List ===');
        result.rows.forEach(row => {
            console.log(`Email: ${row.email}, Role: ${row.role}`);
        });
    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
}

listUsers();
