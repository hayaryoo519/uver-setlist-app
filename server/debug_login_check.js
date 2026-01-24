const db = require('./db');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function checkLogin() {
    try {
        const email = 'a@a';
        const password = 'password123';

        console.log(`Checking login for ${email} with password '${password}'...`);

        const user = await db.query("SELECT * FROM users WHERE email = $1", [email]);

        if (user.rows.length === 0) {
            console.log("User not found!");
            return;
        }

        const userData = user.rows[0];
        console.log(`User found: ID=${userData.id}, Role=${userData.role}`);
        console.log(`Stored Hash: ${userData.password}`);

        const validPassword = await bcrypt.compare(password, userData.password);

        if (validPassword) {
            console.log("✅ Password MATCHES!");
        } else {
            console.log("❌ Password DOES NOT match.");
        }

    } catch (err) {
        console.error("Error:", err);
    }
}

checkLogin();
