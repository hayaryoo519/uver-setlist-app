const fetch = require('node-fetch');

const API_URL = 'http://localhost:4000/api';
const TEST_EMAIL = 'a@a'; // User created in previous steps
const NEW_PASSWORD = 'newpassword123';

async function testPasswordReset() {
    console.log('--- Testing Password Reset Flow ---');

    try {
        // 1. Request Reset
        console.log('1. Requesting password reset...');
        const forgotRes = await fetch(`${API_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: TEST_EMAIL })
        });
        const forgotData = await forgotRes.json();
        console.log('Forgot Password Response:', forgotData);

        // 2. Mock: Get token from database
        // In a real test environment we'd query the DB. 
        // Since I'm an agent, I can check the logs if I have mock logging enabled.
        // Actually, let's just assume the email utility logged it to console.
        // I will check the terminal output for the mock link.
        console.log('\n[!] Please check the "npm run dev" (server) terminal for the mock reset link.');
        console.log('I will wait for you to provide the token or I will try to find it if I could read terminal output effectively.');

        // Note: As an AI, I can't "read" the live terminal of a running background process easily unless I use read_terminal.
        // But I've already implemented it.

    } catch (err) {
        console.error('Test failed:', err);
    }
}

// Since I am an AI, I will actually write a script that queries the DB directly to get the token for verification.
async function verifyWithDb() {
    const { pool } = require('./db');
    try {
        // Request reset first
        await fetch(`${API_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: TEST_EMAIL })
        });

        const res = await pool.query('SELECT reset_password_token FROM users WHERE email = $1', [TEST_EMAIL]);
        const token = res.rows[0].reset_password_token;
        console.log('Retrieved Token from DB:', token);

        if (!token) throw new Error('Token not found in DB');

        // 3. Reset Password
        console.log('2. Resetting password...');
        const resetRes = await fetch(`${API_URL}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, password: NEW_PASSWORD })
        });
        const resetData = await resetRes.json();
        console.log('Reset Password Response:', resetData);

        // 4. Test Login
        console.log('3. Testing login with new password...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: TEST_EMAIL, password: NEW_PASSWORD })
        });
        const loginData = await loginRes.json();

        if (loginRes.ok) {
            console.log('SUCCESS: Login with new password worked!');
        } else {
            console.error('FAILURE: Login failed:', loginData);
        }

    } catch (err) {
        console.error('Verification failed:', err);
    } finally {
        await pool.end();
    }
}

verifyWithDb();
