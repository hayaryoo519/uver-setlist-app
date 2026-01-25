const db = require('./db');
const bcrypt = require('bcrypt');

async function resetPassword() {
    try {
        const password = 'password';
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        await db.query("UPDATE users SET password = $1 WHERE email = 'a@a'", [hash]);
        console.log("Password for a@a reset to 'password'");
    } catch (err) {
        console.error(err);
    } finally {
        if (db.pool) await db.pool.end();
    }
}

resetPassword();
