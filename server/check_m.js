const db = require('./db');

async function checkM() {
    try {
        // Exact match
        const res = await db.query("SELECT * FROM songs WHERE title = 'M'");
        const songs = res.rows;

        console.log("Songs found:", songs.map(s => ({ id: s.id, title: s.title })));

        if (songs.length === 0) {
            console.log("No song named 'M' found.");
            return;
        }

        const ids = songs.map(s => s.id);
        const setlists = await db.query(`
            SELECT sl.id, sl.song_id, s.title 
            FROM setlists sl 
            JOIN songs s ON sl.song_id = s.id 
            WHERE s.id = ANY($1::int[])
        `, [ids]);

        console.log("Setlists using 'M':", setlists.rowCount);
        setlists.rows.forEach(r => {
            console.log(`Setlist ID: ${r.id}, Song ID: ${r.song_id}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        if (db.pool) await db.pool.end();
    }
}

checkM();
