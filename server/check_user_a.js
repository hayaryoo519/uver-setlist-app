const db = require('./db');

async function checkUser() {
    try {
        const res = await db.query("SELECT id, email, is_verified, password FROM users WHERE email = 'a@a'");
        console.log("User a@a:");
        if (res.rows.length === 0) {
            console.log("Not found.");
        } else {
            console.log(res.rows[0]);
        }
    } catch (err) {
        console.error(err);
    } finally {
        if (db.pool) await db.pool.end();
    }
}

checkUser();
