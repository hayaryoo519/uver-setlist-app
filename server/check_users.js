const db = require('./db');

async function checkUsers() {
    try {
        const result = await db.query("SELECT id, email, password FROM users");
        console.log("Users available:", result.rows.map(u => ({ id: u.id, email: u.email })));
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkUsers();
