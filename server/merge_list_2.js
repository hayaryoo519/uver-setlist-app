const db = require('./db');

// MERGE: removeId -> keepId
// Be careful with directions!
const MERGE_PAIRS = [
    { removeId: 274, keepId: 304, title: "THE ONE (SE) -> THE ONE" },
    { removeId: 358, keepId: 318, title: "to the world (SE) -> to the world" },
    { removeId: 408, keepId: 177, title: "Wa'on -> 和音" },
    { removeId: 175, keepId: 359, title: "アイ・アム　Riri (Wrong Album) -> アイ・アム Riri (Correct Album)" },
    { removeId: 188, keepId: 360, title: "ﾊｲ!問題作 -> ハイ!問題作" },
    { removeId: 362, keepId: 156, title: "モノクローム～... -> モノクローム〜..." },
    { removeId: 365, keepId: 166, title: "志 -kokorozashi- (Single) -> 志-kokorozashi- (Album)" },
    { removeId: 397, keepId: 164, title: "心が指す場所... (Short Space) -> 心が指す場所... (Full Space)" },
    { removeId: 367, keepId: 196, title: "超大作+81 -> 超大作＋81" },
    { removeId: 420, keepId: 277, title: "零HERE ~SE~ -> 零 HERE ～SE～" },
    { removeId: 368, keepId: 277, title: "零HERE～SE～ -> 零 HERE ～SE～" }
];

async function runMigration() {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        console.log("--- STARTING MERGE LIST 2 ---");
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
        console.log("Merge List 2 Completed Successfully.");

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Merge Failed:", err);
    } finally {
        client.release();
        process.exit();
    }
}

runMigration();
