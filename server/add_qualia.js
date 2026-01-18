const db = require('./db');

db.query("INSERT INTO songs (title, album) VALUES ('Qualia', 'LIFE 6 SENSE') RETURNING *")
    .then(r => {
        console.log('Added:', r.rows[0]);
        process.exit(0);
    })
    .catch(e => { console.error(e); process.exit(1); });
