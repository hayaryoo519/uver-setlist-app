const db = require('./db');

async function checkCounting() {
    try {
        const res = await db.query("SELECT * FROM songs WHERE title ILIKE '%Count%'");
        console.log("Songs found:", res.rows);

        const setlists = await db.query(`
            SELECT sl.id, sl.song_id, s.title, sl.live_id 
            FROM setlists sl 
            JOIN songs s ON sl.song_id = s.id 
            WHERE s.title ILIKE '%Count%'
        `);
        console.log("Setlists using Counting variants:", setlists.rowCount);
        setlists.rows.forEach(row => {
            console.log(`Setlist ID: ${row.id}, Song: ${row.title} (ID: ${row.song_id})`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        if (db.pool) await db.pool.end();
    }
}

checkCounting();
