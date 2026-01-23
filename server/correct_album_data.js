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

const correctAlbum = async () => {
    console.log("Correcting Album Data...");
    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const res = await client.query(
                "UPDATE songs SET album = 'PROGLUTION' WHERE title = 'counting song-H' OR title = 'counting song -H'"
            );

            console.log(`Updated counting song-H to PROGLUTION: ${res.rowCount} rows`);

            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await pool.end();
    }
};

correctAlbum();
