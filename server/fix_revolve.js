const db = require('./db');
db.query("UPDATE songs SET album = 'Single' WHERE title = 'Revolve'")
    .then(r => { console.log('Updated:', r.rowCount); process.exit(0); })
    .catch(e => { console.error(e); process.exit(1); });
