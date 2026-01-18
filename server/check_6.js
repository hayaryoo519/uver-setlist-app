const db = require('./db');

db.query("SELECT id, title, album FROM songs WHERE title LIKE '%6%' OR title LIKE '%風%'")
    .then(r => {
        r.rows.forEach(row => console.log(row.id + ': ' + row.title + ' (' + row.album + ')'));
        process.exit(0);
    })
    .catch(e => { console.error(e); process.exit(1); });
