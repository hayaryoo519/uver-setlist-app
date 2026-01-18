const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'uver_app_db',
    password: 'postgres',
    port: 54332,
});

async function resetData() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log("Resetting Data...");

        // Delete in order of dependency
        // setlists depends on lives (and songs, but we keep songs)
        console.log("Deleting setlists...");
        await client.query('TRUNCATE TABLE setlists CASCADE');

        console.log("Deleting lives...");
        // Use DELETE instead of TRUNCATE CASCADE to be safe? 
        // Actually TRUNCATE lives CASCADE might affect setlists (which we want) but NOT songs (since songs don't reference lives, lives don't reference songs directly except via setlist)
        // Setlist references songs, so we can delete setlist safely without deleting songs.
        await client.query('TRUNCATE TABLE lives CASCADE');

        // Songs are preserved!

        // Reset Serial IDs
        await client.query('ALTER SEQUENCE lives_id_seq RESTART WITH 1');
        await client.query('ALTER SEQUENCE setlists_id_seq RESTART WITH 1');

        await client.query('COMMIT');
        console.log("✅ Database reset complete (Users table preserved).");

    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Error resetting database:", e);
    } finally {
        client.release();
        pool.end();
    }
}

resetData();
