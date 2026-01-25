const db = require('./db');

async function debugTitles() {
    try {
        // Search specifically for Seitan
        const res = await db.query(`
            SELECT id, date, tour_name, title, venue 
            FROM lives 
            WHERE title LIKE '%生誕%' OR tour_name LIKE '%生誕%'
            ORDER BY date DESC
        `);

        console.log(`Found ${res.rowCount} records matching '生誕'.`);
        res.rows.forEach(r => {
            console.log(`ID: ${r.id}, Date: ${getDateStr(r.date)}`);
            console.log(`   Tour: "${r.tour_name}"`);
            console.log(`   Title: "${r.title}"`);
            console.log(`   Match: ${r.tour_name === r.title}`);
            console.log('---');
        });

    } catch (err) {
        console.error(err);
    } finally {
        if (db.pool) await db.pool.end();
    }
}

function getDateStr(d) {
    if (!d) return 'N/A';
    return new Date(d).toISOString().split('T')[0];
}

debugTitles();
