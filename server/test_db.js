const { Pool } = require('pg');

const pool = new Pool({
    user: 'uver_user',
    host: 'localhost',
    database: 'uver_app_db',
    password: 'uver_password',
    port: 5433,
});

pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Connection error:', err);
    } else {
        console.log('Connected successfully:', res.rows[0]);
    }
    pool.end();
});
