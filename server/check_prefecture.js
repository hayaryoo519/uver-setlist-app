const db = require('./db');

(async () => {
    try {
        // Check lives with no prefecture
        const nullPref = await db.query(
            "SELECT DISTINCT venue, prefecture FROM lives WHERE prefecture IS NULL OR prefecture = '' ORDER BY venue"
        );
        console.log('=== Lives with NO prefecture data ===');
        console.log('Count:', nullPref.rows.length);
        nullPref.rows.forEach(r => console.log('-', r.venue));

        console.log('\n=== Lives WITH prefecture data ===');
        const hasPref = await db.query(
            "SELECT DISTINCT venue, prefecture FROM lives WHERE prefecture IS NOT NULL AND prefecture != '' ORDER BY prefecture, venue"
        );
        console.log('Count:', hasPref.rows.length);
        hasPref.rows.forEach(r => console.log('-', r.prefecture, ':', r.venue));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
