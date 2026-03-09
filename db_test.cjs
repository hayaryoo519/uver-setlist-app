const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server', '.env') });

console.log('Connecting to:', {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
});

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    connectionTimeoutMillis: 5000,
});

pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Connection error:', err.stack);
    } else {
        console.log('Connection success:', res.rows[0]);
    }
    pool.end();
});
