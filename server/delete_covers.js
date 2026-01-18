const db = require('./db');

// 削除する曲のID (カバー曲・他アーティストの曲)
const songsToDelete = [
    { id: 301, title: 'Pretender' },        // Official髭男dism
    { id: 300, title: 'Shukumei' },         // Official髭男dism 宿命
    { id: 336, title: 'Gangnam Style' },    // PSY
    { id: 338, title: 'Ditto' },            // NewJeans
    { id: 334, title: 'Last Christmas' },   // Wham!
    { id: 332, title: 'DON!DON!TAKESHI' },  // 不明・カバー
    { id: 324, title: 'ROSIER' },           // LUNA SEA
    { id: 25, title: 'FINAL ISTV' },       // 不明
    { id: 335, title: 'Countdown' },        // 不明・カバー
    { id: 326, title: 'ONIGIRI' },          // 不明・カバー
    { id: 339, title: 'Mainstream' },       // BE:FIRST
];

(async () => {
    try {
        console.log('=== Deleting non-UVERworld songs ===\n');

        for (const song of songsToDelete) {
            // First delete from setlists (foreign key constraint)
            const setlistDel = await db.query(
                "DELETE FROM setlists WHERE song_id = $1",
                [song.id]
            );

            // Then delete from songs
            const songDel = await db.query(
                "DELETE FROM songs WHERE id = $1",
                [song.id]
            );

            if (songDel.rowCount > 0) {
                console.log(`Deleted: ${song.title} (ID: ${song.id})`);
                if (setlistDel.rowCount > 0) {
                    console.log(`  -> Also removed from ${setlistDel.rowCount} setlists`);
                }
            } else {
                console.log(`Not found: ${song.title} (ID: ${song.id})`);
            }
        }

        console.log('\n=== Done! ===');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
