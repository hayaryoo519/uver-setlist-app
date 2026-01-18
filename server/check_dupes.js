const db = require('./db');

async function findDuplicates() {
    try {
        const res = await db.query("SELECT * FROM songs WHERE title ILIKE '%Honno%' OR title ILIKE '%ほんの%'");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

findDuplicates();
