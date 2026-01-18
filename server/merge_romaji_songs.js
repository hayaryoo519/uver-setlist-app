const db = require('./db');

const MERGE_PAIRS = [
    { romajiId: 386, japaneseId: 180, title: "Madara Chou -> マダラ蝶" },
    { romajiId: 387, japaneseId: 365, title: "Kokorozashi -> 志 -kokorozashi-" },
    { romajiId: 378, japaneseId: 200, title: "Itsuka Kanarazu... -> いつか必ず..." },
    { romajiId: 388, japaneseId: 204, title: "Shousha Okubyoumono -> 勝者臆病者" },
    { romajiId: 409, japaneseId: 250, title: "Muimininaruyoru -> 無意味になる夜" },
    { romajiId: 392, japaneseId: 257, title: "Raichoue -> 来鳥江" }
];

const RENAME_TARGETS = [
    { id: 327, newTitle: "言わなくても伝わる あれは少し嘘だ", old: "Iwanakute mo..." },
    { id: 397, newTitle: "心が指す場所と口癖 そして君がついて来る", old: "Kokoro ga Sasu..." }
];

async function runMigration() {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        console.log("--- STARTING MERGE ---");
        for (const pair of MERGE_PAIRS) {
            console.log(`Merging ${pair.title}...`);

            // 1. Move setlists from Romaji to Japanese
            const updateRes = await client.query(
                "UPDATE setlists SET song_id = $1 WHERE song_id = $2",
                [pair.japaneseId, pair.romajiId]
            );
            console.log(`  Moved ${updateRes.rowCount} setlist entries.`);

            // 2. Delete the Romaji song
            // Check if any remain (should be 0 if upgrade successful, unless constraints exist)
            const check = await client.query("SELECT COUNT(*) FROM setlists WHERE song_id = $1", [pair.romajiId]);
            if (check.rows[0].count == 0) {
                await client.query("DELETE FROM songs WHERE id = $1", [pair.romajiId]);
                console.log(`  Deleted Romaji song ID ${pair.romajiId}.`);
            } else {
                console.warn(`  WARNING: Could not delete song ${pair.romajiId}, still used.`);
            }
        }

        console.log("--- STARTING RENAME ---");
        for (const target of RENAME_TARGETS) {
            console.log(`Renaming ${target.old} to ${target.newTitle}...`);
            await client.query("UPDATE songs SET title = $1 WHERE id = $2", [target.newTitle, target.id]);
        }

        await client.query('COMMIT');
        console.log("Migration Completed Successfully.");

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Migration Failed:", err);
    } finally {
        client.release();
        process.exit();
    }
}

runMigration();
