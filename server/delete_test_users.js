const db = require('./db');

async function deleteUsers() {
    try {
        const idsToDelete = [8, 9, 10, 11, 12];

        // Delete related data first
        await db.query("DELETE FROM corrections WHERE user_id = ANY($1)", [idsToDelete]);
        await db.query("DELETE FROM attendance WHERE user_id = ANY($1)", [idsToDelete]);

        const res = await db.query("DELETE FROM users WHERE id = ANY($1) RETURNING *", [idsToDelete]);

        console.log(`Deleted ${res.rowCount} users.`);
        res.rows.forEach(u => console.log(`- Deleted: ID ${u.id}, Email: ${u.email}`));

    } catch (err) {
        console.error("Error deleting users:", err);
    } finally {
        if (db.pool) await db.pool.end();
    }
}

deleteUsers();
