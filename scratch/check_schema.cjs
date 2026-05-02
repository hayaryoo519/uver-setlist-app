const db = require('./server/db');

async function checkSchema() {
    try {
        console.log("--- Users Table ---");
        const users = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'");
        console.table(users.rows);

        console.log("--- Songs Table ---");
        const songs = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'songs'");
        console.table(songs.rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkSchema();
