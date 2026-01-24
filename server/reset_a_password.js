const bcrypt = require('bcrypt');
const db = require('./db');

async function reset() {
    try {
        console.log('Generating hash...');
        const hash = await bcrypt.hash('password123', 10);
        console.log('Updating DB...');
        await db.query("UPDATE users SET password = $1 WHERE email = 'a@a'", [hash]);
        console.log('Password reset for a@a to "password123"');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

reset();
