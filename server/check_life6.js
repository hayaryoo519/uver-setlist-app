const db = require('./db');

db.query("SELECT id, title, album FROM songs WHERE album = 'LIFE 6 SENSE' OR album = 'Qualia' ORDER BY title")
    .then(r => {
        r.rows.forEach(row => console.log(row.id + ': ' + row.title + ' (' + row.album + ')'));
        process.exit(0);
    })
    .catch(e => { console.error(e); process.exit(1); });
