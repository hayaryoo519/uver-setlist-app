const db = require('./db');

const today = new Date();
const todayStr = today.toISOString().split('T')[0];

console.log(`Checking future lives from ${todayStr}...`);

async function run() {
    try {
        const result = await db.query('SELECT * FROM lives WHERE date >= $1 ORDER BY date ASC', [todayStr]);
        const rows = result.rows;

        console.log(`Found ${rows.length} future lives.`);
        rows.forEach(r => console.log(`- ${r.date}: ${r.title || r.tour_name}`));

        if (rows.length < 4) {
            const needed = 4 - rows.length;
            console.log(`Need ${needed} more future lives.`);

            const nextMonth = new Date(today);
            nextMonth.setMonth(nextMonth.getMonth() + 2); // Start 2 months ahead

            for (let i = 0; i < needed; i++) {
                const d = new Date(nextMonth);
                d.setDate(d.getDate() + i);
                const dateStr = d.toISOString().split('T')[0];
                const title = `Future Live Test ${i + 1}`;
                const venue = `Venue ${i + 1}`;

                await db.query(`
                    INSERT INTO lives (tour_name, title, date, venue, type)
                    VALUES ($1, $2, $3, $4, 'tour')
                `, ["UVERworld FUTURE TOUR 2026", title, dateStr, venue]);

                console.log(`Inserted future live: ${dateStr} @ ${venue}`);
            }
            console.log("Done inserting.");
        } else {
            console.log("Sufficient future lives exist.");
        }
    } catch (err) {
        console.error("Error:", err);
    } finally {
        // Pool needs to be closed? db.pool.end() if exposed, but db.js exports query and pool.
        if (db.pool) {
            await db.pool.end();
            console.log("Pool closed.");
        }
    }
}

run();
