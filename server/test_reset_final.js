const fetch = require('node-fetch');

const API_URL = 'http://localhost:4002/api';
const TEST_EMAIL = 'a@a';
const NEW_PASSWORD = 'finalpassword123';

async function runTest() {
    console.log('Starting Clean Reset Flow Test...');

    // 1. Request Reset
    const res1 = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TEST_EMAIL })
    });
    const text1 = await res1.text();
    console.log('Step 1 (Forgot) Status:', res1.status);
    console.log('Step 1 (Forgot) Raw:', text1);
    const data1 = JSON.parse(text1);
    console.log('Step 1 (Forgot) Data:', data1);

    // 2. Get Token (via DB)
    const { pool } = require('./db');
    const dbRes = await pool.query('SELECT reset_password_token FROM users WHERE email = $1', [TEST_EMAIL]);
    const token = dbRes.rows[0].reset_password_token;
    console.log('Step 2 (Token):', token);

    if (!token) {
        console.error('CRITICAL: Token is NULL in DB');
        await pool.end();
        return;
    }

    // 3. Reset Password
    const res2 = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: NEW_PASSWORD })
    });
    console.log('Step 3 (Reset):', res2.status, await res2.json());

    // 4. Verification Login
    const res3 = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TEST_EMAIL, password: NEW_PASSWORD })
    });
    console.log('Step 4 (Login):', res3.status, res3.ok ? 'SUCCESS' : 'FAILED');

    await pool.end();
}

runTest().catch(console.error);
