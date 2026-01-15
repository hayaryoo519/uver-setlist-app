require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function simulateRoute(idParam) {
    try {
        console.log(`Testing ID Param: "${idParam}"`);
        const isId = /^\d+$/.test(idParam);
        let query, queryParams;

        if (isId) {
            console.log("Detected as ID");
            query = `
                SELECT
                  s.*,
                  COUNT(l.id)::int as total_performances
                  -- Simplified query for testing
                FROM songs s
                LEFT JOIN setlists sl ON s.id = sl.song_id
                LEFT JOIN lives l ON sl.live_id = l.id
                WHERE s.id = $1
                GROUP BY s.id
            `;
            queryParams = [idParam];
        } else {
            console.log("Detected as Title");
            const decodedTitle = decodeURIComponent(idParam);
            console.log(`Decoded Title: "${decodedTitle}"`);
            query = `
                SELECT
                  s.*,
                  COUNT(l.id)::int as total_performances
                FROM songs s
                LEFT JOIN setlists sl ON s.id = sl.song_id
                LEFT JOIN lives l ON sl.live_id = l.id
                -- Simulate Backend Logic:
                WHERE REPLACE(LOWER(s.title), ' ', '') = REPLACE(LOWER($1), ' ', '')
                GROUP BY s.id
            `;
            queryParams = [decodedTitle];
        }

        console.log("Executing Query...");
        const result = await pool.query(query, queryParams);
        console.log("Result Count:", result.rows.length);
        if (result.rows.length > 0) console.log("First Row:", result.rows[0].title);

    } catch (err) {
        console.error("ERROR CAUGHT:");
        console.error(err);
    } finally {
        pool.end();
    }
}

simulateRoute("CORE%20PRIDE");
