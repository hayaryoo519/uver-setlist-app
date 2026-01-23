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

const listUnknownSongs = async () => {
    try {
        const client = await pool.connect();
        try {
            const res = await client.query(
                "SELECT id, title, album FROM songs WHERE album IS NULL OR album = '' OR album = 'Unknown' ORDER BY title"
            );

            console.log("\n=== Songs with Missing Album Data ===");
            if (res.rows.length === 0) {
                console.log("No songs found with missing album data.");
            } else {
                res.rows.forEach(song => {
                    console.log(`- ${song.title} (Current Album: ${song.album || 'NULL'})`);
                });
                console.log(`\nTotal: ${res.rows.length} songs`);
            }
        } finally {
            client.release();
        }
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await pool.end();
    }
};

listUnknownSongs();
