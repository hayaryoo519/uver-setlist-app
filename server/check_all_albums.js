const db = require('./db');

(async () => {
    try {
        // 全アルバムの曲数と内容を確認
        const albums = await db.query(
            "SELECT album, COUNT(*) as cnt FROM songs GROUP BY album ORDER BY album"
        );

        console.log('=== Album Summary ===');
        for (const row of albums.rows) {
            console.log(`${row.album || 'NULL'}: ${row.cnt} songs`);
        }

        // ENIGMASISの詳細
        console.log('\n=== ENIGMASIS Details ===');
        const enigmasis = await db.query(
            "SELECT id, title FROM songs WHERE album = 'ENIGMASIS' ORDER BY title"
        );
        enigmasis.rows.forEach(r => console.log(r.id, ':', r.title));

        process.exit(0);
    } catch (e) { console.error(e); process.exit(1); }
})();
