const db = require('./db');

const MERGE_PAIRS = [
    { removeId: 366, keepId: 106, title: "恋しくて -> 恋いしくて" }
];

async function runMigration() {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        console.log("--- STARTING MERGE KOISHIKUTE ---");
        for (const pair of MERGE_PAIRS) {
            console.log(`Merging ${pair.title}...`);

            // 1. Move setlists
            const updateRes = await client.query(
                "UPDATE setlists SET song_id = $1 WHERE song_id = $2",
                [pair.keepId, pair.removeId]
            );
            console.log(`  Moved ${updateRes.rowCount} setlist entries.`);

            // 2. Delete removeId
            const check = await client.query("SELECT COUNT(*) FROM setlists WHERE song_id = $1", [pair.removeId]);
            if (check.rows[0].count == 0) {
                await client.query("DELETE FROM songs WHERE id = $1", [pair.removeId]);
                console.log(`  Deleted song ID ${pair.removeId}.`);
            } else {
                console.warn(`  WARNING: Could not delete song ${pair.removeId}, still used.`);
            }
        }

        await client.query('COMMIT');
        console.log("Merge Koishikute Completed Successfully.");

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Merge Failed:", err);
    } finally {
        client.release();
        process.exit();
    }
}

runMigration();
