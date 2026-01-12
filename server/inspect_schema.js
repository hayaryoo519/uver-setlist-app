const db = require('./db');

async function inspect() {
    try {
        console.log("Inspecting 'lives' table schema...");
        const result = await db.query(`
            SELECT column_name, data_type, udt_name
            FROM information_schema.columns 
            WHERE table_name = 'lives';
        `);
        console.log(result.rows);
        process.exit(0);
    } catch (err) {
        console.error("Inspection failed:", err);
        process.exit(1);
    }
}

inspect();
