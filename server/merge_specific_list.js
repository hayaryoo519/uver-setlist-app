const db = require('./db');

// MERGE: romajiId -> JapaneseId
// This script moves all setlists from romajiId to japaneseId, then deletes romajiId.
const MERGE_PAIRS = [
    { romajiId: 347, japaneseId: 307, title: "= (Equal) -> =" },
    { romajiId: 385, japaneseId: 369, title: "~Nagare... -> ～流れ・空虚・THIS WORD～" },
    { romajiId: 278, japaneseId: 402, title: "ANOMALY 奏者 -> ANOMALY奏者" },
    { romajiId: 352, japaneseId: 328, title: "Prime -> PRIME" },
    { romajiId: 375, japaneseId: 207, title: "Barbell... -> バーベル～皇帝...ver.～" }
];

async function runMigration() {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        console.log("--- STARTING MANUAL MERGE ---");
        for (const pair of MERGE_PAIRS) {
            console.log(`Merging ${pair.title}...`);

            // 0. (Optional) Copy metadata if target is missing it and source has it
            const sourceRes = await client.query("SELECT * FROM songs WHERE id = $1", [pair.romajiId]);
            const targetRes = await client.query("SELECT * FROM songs WHERE id = $1", [pair.japaneseId]);

            if (sourceRes.rows.length > 0 && targetRes.rows.length > 0) {
                const source = sourceRes.rows[0];
                const target = targetRes.rows[0];

                // Fields to potentiall copy: album, author, release_year
                if (!target.album && source.album) {
                    console.log(`  Updating target album to '${source.album}'`);
                    await client.query("UPDATE songs SET album = $1 WHERE id = $2", [source.album, pair.japaneseId]);
                }
            }

            // 1. Move setlists
            const updateRes = await client.query(
                "UPDATE setlists SET song_id = $1 WHERE song_id = $2",
                [pair.japaneseId, pair.romajiId]
            );
            console.log(`  Moved ${updateRes.rowCount} setlist entries.`);

            // 2. Delete source song
            const check = await client.query("SELECT COUNT(*) FROM setlists WHERE song_id = $1", [pair.romajiId]);
            if (check.rows[0].count == 0) {
                await client.query("DELETE FROM songs WHERE id = $1", [pair.romajiId]);
                console.log(`  Deleted source song ID ${pair.romajiId}.`);
            } else {
                console.warn(`  WARNING: Could not delete song ${pair.romajiId}, still used.`);
            }
        }

        await client.query('COMMIT');
        console.log("Manual Merge Completed Successfully.");

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Merge Failed:", err);
    } finally {
        client.release();
        process.exit();
    }
}

runMigration();
