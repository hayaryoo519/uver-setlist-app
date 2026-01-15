require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function findMalformedSetlists() {
    try {
        const res = await pool.query(`
            SELECT id, date, tour_name, setlist 
            FROM lives 
            WHERE setlist IS NOT NULL
        `);

        let malformedCount = 0;
        res.rows.forEach(live => {
            let isMalformed = false;
            const setlist = live.setlist || [];

            setlist.forEach(song => {
                // Check if id exists and is NOT a number (e.g. it's a string that looks like a title)
                // Note: Some might be strings like "1", which is fine-ish, but "ENIGMASIS" is bad.
                if (song.id && isNaN(Number(song.id))) {
                    console.log(`[Malformed] Live ID: ${live.id}, Date: ${live.date}, Song: ${song.title}, ID: ${song.id}`);
                    isMalformed = true;
                }
            });

            if (isMalformed) malformedCount++;
        });

        console.log(`Total malformed lives found: ${malformedCount}`);

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

findMalformedSetlists();
