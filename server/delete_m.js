const db = require('./db');

async function deleteM() {
    try {
        const res = await db.query("SELECT * FROM songs WHERE title = 'M'");
        const song = res.rows[0];

        if (!song) {
            console.log("Song 'M' not found.");
            return;
        }

        console.log(`Deleting song "${song.title}" (ID: ${song.id})`);

        // Delete from setlists first (foreign key)
        const delSetlists = await db.query(
            "DELETE FROM setlists WHERE song_id = $1",
            [song.id]
        );
        console.log(`Deleted ${delSetlists.rowCount} setlist entries.`);

        // Delete song
        const delSong = await db.query("DELETE FROM songs WHERE id = $1", [song.id]);
        console.log(`Deleted song record: ${delSong.rowCount}`);

    } catch (err) {
        console.error(err);
    } finally {
        if (db.pool) await db.pool.end();
    }
}

deleteM();
