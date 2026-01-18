const db = require('./db');

(async () => {
    try {
        // Songs without album data
        const nullAlbum = await db.query(
            "SELECT id, title, album FROM songs WHERE album IS NULL OR album = '' ORDER BY title"
        );
        console.log('=== Songs with NO album data ===');
        console.log('Count:', nullAlbum.rows.length);
        nullAlbum.rows.forEach(r => console.log(r.id, ':', r.title));

        // All unique albums
        console.log('\n=== All unique albums ===');
        const albums = await db.query(
            "SELECT album, COUNT(*) as cnt FROM songs WHERE album IS NOT NULL AND album != '' GROUP BY album ORDER BY album"
        );
        albums.rows.forEach(r => console.log(r.album, ':', r.cnt, 'songs'));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
