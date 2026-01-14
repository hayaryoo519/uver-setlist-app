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

async function testQuery() {
    try {
        const id = 1; // Assuming song ID 1 exists
        console.log("Testing query for Song ID:", id);

        const query = `
            SELECT
              s.*,
              COALESCE(
                JSON_AGG(
                  JSON_BUILD_OBJECT(
                    'id', l.id,
                    'tour_name', l.tour_name,
                    'title', l.title,
                    'date', l.date,
                    'venue', l.venue,
                    'type', l.type
                  ) ORDER BY l.date DESC
                ) FILTER (WHERE l.id IS NOT NULL), '[]'
              ) as performances
            FROM songs s
            LEFT JOIN setlists sl ON s.id = sl.song_id
            LEFT JOIN lives l ON sl.live_id = l.id
            WHERE s.id = $1
            GROUP BY s.id
        `;

        const result = await pool.query(query, [id]);
        console.log("Success:", result.rows[0]);
    } catch (err) {
        console.error("Query Failed:", err.message);
    } finally {
        pool.end();
    }
}

testQuery();
