const db = require('./db');

async function inspectTypes() {
    try {
        const types = await db.query("SELECT DISTINCT type FROM lives");
        console.log("Distinct Types:", types.rows.map(r => r.type));

        const tours = await db.query("SELECT DISTINCT tour_name FROM lives WHERE tour_name LIKE '%FES%' OR tour_name LIKE '%Festival%'");
        console.log("Potential Festival Tour Names:", tours.rows.map(r => r.tour_name));
    } catch (err) {
        console.error(err);
    } finally {
        if (db.pool) await db.pool.end();
    }
}

inspectTypes();
