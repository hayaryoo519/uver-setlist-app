const db = require('./db');

(async () => {
    try {
        // First delete from setlists
        const setlistDel = await db.query("DELETE FROM setlists WHERE song_id = 337");
        console.log('Deleted from setlists:', setlistDel.rowCount);

        // Then delete the song
        const songDel = await db.query("DELETE FROM songs WHERE id = 337");
        console.log('Deleted song:', songDel.rowCount);

        process.exit(0);
    } catch (e) { console.error(e); process.exit(1); }
})();
