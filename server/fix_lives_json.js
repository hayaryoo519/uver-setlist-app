require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function fixMalformedSetlists() {
    try {
        console.log("Fetching songs for lookup...");
        const songsRes = await pool.query('SELECT id, title FROM songs');
        const songMap = new Map();
        songsRes.rows.forEach(s => songMap.set(s.title, s.id));

        console.log("Fetching lives with setlists...");
        const livesRes = await pool.query('SELECT id, date, tour_name, setlist FROM lives WHERE setlist IS NOT NULL');

        let updateCount = 0;

        for (const live of livesRes.rows) {
            let needsUpdate = false;
            let setlist = live.setlist || [];

            const newSetlist = setlist.map(song => {
                // If id is missing or not a number, try to fix it
                if (!song.id || isNaN(Number(song.id))) {
                    const correctId = songMap.get(song.title);
                    if (correctId) {
                        needsUpdate = true;
                        // console.log(`Fixing: ${song.title} -> ID: ${correctId}`);
                        return { ...song, id: correctId };
                    } else {
                        // console.warn(`Warning: Could not find ID for song: ${song.title} in live ${live.id}`);
                        return song; // Keep as is if lookup fails
                    }
                }
                return song;
            });

            if (needsUpdate) {
                await pool.query('UPDATE lives SET setlist = $1 WHERE id = $2', [JSON.stringify(newSetlist), live.id]);
                updateCount++;
                // console.log(`Updated Live ID: ${live.id}`);
            }
        }

        console.log(`Fix Complete. Updated ${updateCount} live records.`);

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

fixMalformedSetlists();
