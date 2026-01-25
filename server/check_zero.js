const db = require('./db');

async function checkZero() {
    try {
        const res = await db.query("SELECT * FROM songs WHERE title LIKE '%HERE%'");
        // Filter mainly for Zero/Rei
        const songs = res.rows.filter(s => s.title.includes('零') || s.title.toUpperCase().includes('REI'));

        console.log("Songs found:", songs.map(s => ({ id: s.id, title: s.title })));

        if (songs.length === 0) {
            console.log("No matching songs found.");
            return;
        }

        const ids = songs.map(s => s.id);
        const setlists = await db.query(`
            SELECT sl.id, sl.song_id, s.title 
            FROM setlists sl 
            JOIN songs s ON sl.song_id = s.id 
            WHERE s.id = ANY($1::int[])
        `, [ids]);

        console.log("Setlists using these variants:", setlists.rowCount);

        // Group count by title
        const counts = {};
        setlists.rows.forEach(r => {
            counts[r.title] = (counts[r.title] || 0) + 1;
        });
        console.log("Usage counts:", counts);

    } catch (err) {
        console.error(err);
    } finally {
        if (db.pool) await db.pool.end();
    }
}

checkZero();
