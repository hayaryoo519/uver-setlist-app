const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'uver_app_db',
    password: 'postgres',
    port: 54332,
});

async function removeDuplicates() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log("Analyzing duplicates...");

        // Find duplicates (group by date, venue)
        const res = await client.query(`
            SELECT date, venue, array_agg(id) as ids, count(*) as count
            FROM lives 
            GROUP BY date, venue 
            HAVING count(*) > 1 
            ORDER BY date
        `);

        console.log(`Found ${res.rowCount} duplicate groups.`);

        let deletedCount = 0;

        for (const group of res.rows) {
            const ids = group.ids; // All IDs for this date/venue

            // Priority Check: Which one has setlists?
            let bestId = ids[0];
            let maxSetlistCount = -1;

            for (const id of ids) {
                const slRes = await client.query('SELECT count(*) FROM setlists WHERE live_id = $1', [id]);
                const count = parseInt(slRes.rows[0].count);
                if (count > maxSetlistCount) {
                    maxSetlistCount = count;
                    bestId = id;
                }
            }

            console.log(`Processing ${group.date.toISOString().split('T')[0]} @ ${group.venue}: Keeping ID ${bestId} (Setlist items: ${maxSetlistCount}), Deleting others...`);

            // Delete others
            const idsToDelete = ids.filter(id => id !== bestId);
            if (idsToDelete.length > 0) {
                await client.query('DELETE FROM lives WHERE id = ANY($1::int[])', [idsToDelete]);
                deletedCount += idsToDelete.length;
            }
        }

        console.log(`\nDeleted total ${deletedCount} duplicate lives.`);
        await client.query('COMMIT');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Error:", e);
    } finally {
        client.release();
        pool.end();
    }
}

removeDuplicates();
