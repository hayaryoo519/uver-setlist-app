const db = require('../db');

const listUsers = async () => {
    try {
        const res = await db.query("SELECT id, username, email, role FROM users");
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
};

listUsers();
