require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkHyphens() {
    try {
        const res = await pool.query("SELECT title FROM songs WHERE title LIKE '%-%'");
        console.log("Songs with hyphens:", res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkHyphens();
