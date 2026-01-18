const db = require('./db');
db.query("UPDATE songs SET album = 'Timeless' WHERE title = 'SHINE'")
    .then(r => { console.log('Updated SHINE:', r.rowCount); process.exit(0); })
    .catch(e => { console.error(e); process.exit(1); });
