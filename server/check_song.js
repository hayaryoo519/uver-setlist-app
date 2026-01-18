const db = require('./db');

db.query("SELECT id, title, album FROM songs WHERE title ILIKE '%シャル%' OR title ILIKE '%charmant%'")
    .then(r => {
        console.log('Found:', r.rows);
        process.exit(0);
    })
    .catch(e => { console.error(e); process.exit(1); });
