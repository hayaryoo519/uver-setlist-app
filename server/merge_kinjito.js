const db = require('./db');

async function mergeKinjito() {
    try {
        // Need IDs properly. Fetch them dynamically to be safe.
        const songs = await db.query("SELECT * FROM songs WHERE title LIKE 'KINJITO%'");
        const correct = songs.rows.find(s => s.title === 'KINJITO');
        const wrong = songs.rows.find(s => s.title === 'KINJITO (LIVE intro ver.)');

        if (!correct || !wrong) {
            console.log("Could not find both songs. Aborting.");
            console.log("Found:", songs.rows.map(s => s.title));
            return;
        }

        console.log(`Merging "${wrong.title}" (ID: ${wrong.id}) into "${correct.title}" (ID: ${correct.id})`);

        // Update Setlists
        const update = await db.query(
            "UPDATE setlists SET song_id = $1 WHERE song_id = $2",
            [correct.id, wrong.id]
        );
        console.log(`Updated ${update.rowCount} setlist entries.`);

        // Delete valid song
        const del = await db.query("DELETE FROM songs WHERE id = $1", [wrong.id]);
        console.log(`Deleted song ID ${wrong.id}: ${del.rowCount}`);

    } catch (err) {
        console.error(err);
    } finally {
        if (db.pool) await db.pool.end();
    }
}

mergeKinjito();
