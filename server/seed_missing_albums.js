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

const updates = {
    // Re-categorize as Others (Not UVERworld songs)
    "ONIGIRI": "Others",
    "徒労": "Others",
    "DON!DON!TAKESHI": "Others",

    // Keep Unreleased
    "counting song-H": "Unreleased",
};

const seedMissingAlbums = async () => {
    console.log("Updating Categories...");
    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            for (const [title, album] of Object.entries(updates)) {
                // Force update even if already set
                const res = await client.query(
                    "UPDATE songs SET album = $1 WHERE title = $2",
                    [album, title]
                );
                if (res.rowCount > 0) {
                    console.log(`Updated ${title} -> ${album}`);
                }
            }

            await client.query('COMMIT');
            console.log("Completed.");
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

seedMissingAlbums();
