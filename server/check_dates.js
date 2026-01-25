const db = require('./db');

async function checkDates() {
    try {
        // Check Takuya's birthday (Dec 21) for last 5 years
        const res = await db.query(`
            SELECT id, date, tour_name, title 
            FROM lives 
            WHERE date::text LIKE '%-12-21%' 
            ORDER BY date DESC
        `);

        console.log("Lives on Dec 21:");
        res.rows.forEach(r => {
            console.log(`ID: ${r.id}, Date: ${getDateStr(r.date)}`);
            console.log(`   Tour: "${r.tour_name}"`);
            console.log(`   Title: "${r.title}"`);
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

checkDates();
