const db = require('./db');

(async () => {
    try {
        // まず両方のIDを確認
        const songs = await db.query(
            "SELECT id, title FROM songs WHERE title LIKE '%HERE%SE%' ORDER BY id"
        );
        console.log('Found songs:', songs.rows);

        // ID 277 (零 HERE ～SE～) を残し、ID 288 (Zero HERE ~SE~) を削除
        // 先にセットリストのsong_idを277に変更
        const updateSetlist = await db.query(
            "UPDATE setlists SET song_id = 277 WHERE song_id = 288"
        );
        console.log('Updated setlists:', updateSetlist.rowCount);

        // ID 288を削除
        const deleteSong = await db.query("DELETE FROM songs WHERE id = 288");
        console.log('Deleted song 288:', deleteSong.rowCount);

        // 確認
        const check = await db.query("SELECT * FROM songs WHERE id IN (277, 288)");
        console.log('Remaining:', check.rows);

        process.exit(0);
    } catch (e) { console.error(e); process.exit(1); }
})();
