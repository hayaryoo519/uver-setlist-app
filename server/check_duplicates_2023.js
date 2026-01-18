const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'uver_app_db',
    password: 'postgres',
    port: 54332,
});

async function checkDuplicates() {
    try {
        const res = await pool.query(`
            SELECT date, venue, count(*) 
            FROM lives 
            WHERE date >= '2023-01-01' AND date <= '2023-12-31' 
            GROUP BY date, venue 
            HAVING count(*) > 1 
            ORDER BY date;
        `);

        console.log(`Found ${res.rowCount} duplicates in 2023:`);
        res.rows.forEach(r => {
            console.log(`${r.date.toISOString().split('T')[0]} @ ${r.venue}: ${r.count} records`);
        });

        // Total count check
        const total = await pool.query("SELECT count(*) FROM lives WHERE date >= '2023-01-01' AND date <= '2023-12-31'");
        console.log(`Total lives in 2023: ${total.rows[0].count}`);

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

checkDuplicates();
