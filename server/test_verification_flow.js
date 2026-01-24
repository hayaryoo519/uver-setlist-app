const axios = require('axios');
const db = require('./db');

const API_URL = 'http://localhost:4000/api/auth';
const TEST_EMAIL = 'verify_flow_test_' + Date.now() + '@example.com';
const TEST_USER = 'FlowUser_' + Date.now();
const PASSWORD = 'password123';

async function runTest() {
    try {
        console.log('--- 1. Registering User ---');
        console.log(`Email: ${TEST_EMAIL}`);

        let registerRes;
        try {
            registerRes = await axios.post(`${API_URL}/register`, {
                username: TEST_USER,
                email: TEST_EMAIL,
                password: PASSWORD
            });
            console.log('Register Response:', registerRes.data);
        } catch (e) {
            console.error('Register Failed:', e.response ? e.response.data : e.message);
            process.exit(1);
        }

        if (registerRes.data.requireVerification !== true) {
            console.error('Step 1 Failed: requireVerification should be true');
            process.exit(1);
        }
        console.log('Step 1 Passed: Registration successful, verification required.\n');


        console.log('--- 2. Try Login BEFORE Verification (Should Fail) ---');
        try {
            await axios.post(`${API_URL}/login`, {
                email: TEST_EMAIL,
                password: PASSWORD
            });
            console.error('Step 2 Failed: Login succeeded but should have failed');
            process.exit(1);
        } catch (e) {
            if (e.response && e.response.status === 401 && e.response.data.requireVerification) {
                console.log('Step 2 Passed: Login blocked as expected:', e.response.data.message);
            } else {
                console.error('Step 2 Failed: Unexpected error', e.response ? e.response.data : e.message);
                process.exit(1);
            }
        }
        console.log('');


        console.log('--- 3. Retrieve Token from DB ---');
        const userRes = await db.query('SELECT * FROM users WHERE email = $1', [TEST_EMAIL]);
        if (userRes.rows.length === 0) {
            console.error('Step 3 Failed: User not found in DB');
            process.exit(1);
        }
        const user = userRes.rows[0];
        const token = user.verification_token;
        console.log('Step 3 Passed: Token retrieved:', token);
        console.log('');


        console.log('--- 4. Verify Email ---');
        try {
            const verifyRes = await axios.post(`${API_URL}/verify-email`, {
                token: token
            });
            console.log('Verify Response:', verifyRes.data);
            if (!verifyRes.data.token) {
                console.error('Step 4 Failed: No JWT token in verify response');
                process.exit(1);
            }
        } catch (e) {
            console.error('Verify Failed:', e.response ? e.response.data : e.message);
            process.exit(1);
        }
        console.log('Step 4 Passed: Verification successful.\n');


        console.log('--- 5. Login AFTER Verification (Should Succeed) ---');
        try {
            const loginRes = await axios.post(`${API_URL}/login`, {
                email: TEST_EMAIL,
                password: PASSWORD
            });
            console.log('Login Response:', loginRes.data);
            if (!loginRes.data.token) {
                console.error('Step 5 Failed: No JWT token in login response');
                process.exit(1);
            }
        } catch (e) {
            console.error('Login Failed:', e.response ? e.response.data : e.message);
            process.exit(1);
        }
        console.log('Step 5 Passed: Login successful.\n');

        console.log('=== TEST SUITE PASSED ===');
        process.exit(0);

    } catch (err) {
        console.error('Unexpected System Error:', err);
        process.exit(1);
    }
}

runTest();
