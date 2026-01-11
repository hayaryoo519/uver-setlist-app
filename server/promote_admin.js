const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME
});

const promote = async () => {
    try {
        // Update ALL users to role 'admin' for MVP simplicity
        const result = await pool.query("UPDATE users SET role = 'admin' RETURNING *");
        console.log(`Promoted ${result.rowCount} users to Admin.`);
        console.log(result.rows);
    } catch (err) {
        console.error("Promotion failed:", err.message);
    } finally {
        await pool.end();
    }
};

promote();
