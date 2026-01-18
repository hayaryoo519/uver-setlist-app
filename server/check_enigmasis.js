const db = require('./db');

(async () => {
    try {
        const res = await db.query("SELECT id, title FROM songs WHERE album = 'ENIGMASIS' ORDER BY title");
        console.log('=== ENIGMASIS songs in DB:', res.rows.length, '===');
        res.rows.forEach(r => console.log(r.id, ':', r.title));
        process.exit(0);
    } catch (e) { console.error(e); process.exit(1); }
})();
