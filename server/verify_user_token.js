const db = require('./db');

async function checkUser() {
    try {
        const result = await db.query("SELECT email, is_verified, verification_token FROM users WHERE email LIKE 'verify%' ORDER BY created_at DESC LIMIT 5");
        console.log('=== Recent Verification Users ===');
        console.log(result.rows);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

checkUser();
