const db = require('./db');

(async () => {
    try {
        // Check existing songs
        const check = await db.query("SELECT id, title, album FROM songs WHERE title IN ('Qualia', 'クオリア')");
        console.log('Found:', check.rows);

        // Delete Qualia (English version) since クオリア already exists
        const del = await db.query("DELETE FROM songs WHERE title = 'Qualia' RETURNING *");
        console.log('Deleted:', del.rows);

        // Update クオリア to have correct album
        const update = await db.query("UPDATE songs SET album = 'LIFE 6 SENSE' WHERE title = 'クオリア' RETURNING *");
        console.log('Updated:', update.rows);

        process.exit(0);
    } catch (e) { console.error(e); process.exit(1); }
})();
