const db = require('./db');
db.query("SELECT id, title, album FROM songs WHERE title = '='")
    .then(r => { console.log(r.rows); process.exit(0); })
    .catch(e => { console.error(e); process.exit(1); });
