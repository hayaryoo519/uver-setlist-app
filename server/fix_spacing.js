const db = require('./db');

(async () => {
    try {
        // Fix ANOMALY奏者 -> add space
        const fix1 = await db.query(
            "UPDATE songs SET title = 'ANOMALY 奏者' WHERE title = 'ANOMALY奏者' RETURNING *"
        );
        console.log('Fixed ANOMALY奏者:', fix1.rows);

        // Check other potential mismatches
        const check = await db.query(`
            SELECT id, title, album FROM songs 
            WHERE title LIKE '%AFTER%' OR title LIKE '%Making%'
            ORDER BY title
        `);
        console.log('Related songs:', check.rows);

        process.exit(0);
    } catch (e) { console.error(e); process.exit(1); }
})();
