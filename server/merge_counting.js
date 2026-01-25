const db = require('./db');

async function mergeCounting() {
    try {
        // Find variations
        const res = await db.query("SELECT * FROM songs WHERE title ILIKE 'counting song%H%'");
        const songs = res.rows;
        console.log("Found songs:", songs.map(s => ({ id: s.id, title: s.title })));

        // Target: ID 384 (known strictly from previous step as having setlists)
        // Or strictly find one to become "Counting Song-H"
        let primary = songs.find(s => s.title === 'Counting Song-H');

        if (!primary) {
            // Prioritize ID 384 if present, else just take the first one
            primary = songs.find(s => s.id === 384);
            if (!primary && songs.length > 0) primary = songs[0];

            if (primary) {
                console.log(`Renaming "${primary.title}" (ID: ${primary.id}) to "Counting Song-H"`);
                await db.query("UPDATE songs SET title = 'Counting Song-H' WHERE id = $1", [primary.id]);
                primary.title = 'Counting Song-H';
            }
        }

        if (!primary) {
            console.log("No relevant songs found.");
            return;
        }

        // Others to merge
        const toMerge = songs.filter(s => s.id !== primary.id);

        for (const s of toMerge) {
            console.log(`Merging "${s.title}" (ID: ${s.id}) into "${primary.title}" (ID: ${primary.id})`);

            // Move setlists
            try {
                const up = await db.query("UPDATE setlists SET song_id = $1 WHERE song_id = $2", [primary.id, s.id]);
                console.log(`  Updated ${up.rowCount} setlists.`);

                // Delete song
                await db.query("DELETE FROM songs WHERE id = $1", [s.id]);
                console.log(`  Deleted song ID ${s.id}`);
            } catch (e) {
                console.error(`Error merging ID ${s.id}:`, e.message);
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        if (db.pool) await db.pool.end();
    }
}

mergeCounting();
