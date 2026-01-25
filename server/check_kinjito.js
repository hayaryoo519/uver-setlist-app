const db = require('./db');

async function checkKinjito() {
    try {
        const res = await db.query("SELECT * FROM songs WHERE title LIKE 'KINJITO%'");
        console.log("Songs found:", res.rows);

        const setlists = await db.query(`
            SELECT sl.id, sl.song_id, s.title, sl.live_id 
            FROM setlists sl 
            JOIN songs s ON sl.song_id = s.id 
            WHERE s.title LIKE 'KINJITO%'
        `);
        console.log("Setlists using KINJITO variants:", setlists.rowCount);
        setlists.rows.forEach(row => {
            console.log(`Setlist ID: ${row.id}, Song: ${row.title} (ID: ${row.song_id})`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        if (db.pool) await db.pool.end();
    }
}

checkKinjito();
