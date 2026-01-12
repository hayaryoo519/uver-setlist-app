const db = require('./db');

async function inspectAttendanceSchema() {
    try {
        const query = `
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'attendance';
        `;
        const result = await db.query(query);
        console.log("Attendance Schema:", result.rows);
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

inspectAttendanceSchema();
