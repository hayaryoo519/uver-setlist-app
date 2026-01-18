const db = require('../db');

const setAdmin = async () => {
    try {
        const username = 'admin2';
        console.log(`Updating role for ${username}...`);
        const res = await db.query("UPDATE users SET role = 'admin' WHERE username = $1 RETURNING *", [username]);
        if (res.rows.length > 0) {
            console.log("Success:", res.rows[0]);
        } else {
            console.log("User not found or no change.");
        }
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
};

setAdmin();
