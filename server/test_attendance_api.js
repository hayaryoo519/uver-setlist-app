const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:4000/api';
// Use a unique email for testing or reuse if logic handles existing
const TEST_USER = {
    username: 'api_tester',
    email: `api_test_${Date.now()}@example.com`,
    password: 'password123'
};

async function testAttendanceAPI() {
    try {
        // 1. Register (to ensure we have a valid user)
        console.log("Registering new user...");
        const regRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(TEST_USER)
        });

        let token;

        if (regRes.ok) {
            const data = await regRes.json();
            token = data.token;
            console.log("Registration successful.");
        } else {
            console.log("Registration failed or user exists, trying login...");
            const loginRes = await fetch(`${BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: TEST_USER.email, password: TEST_USER.password })
            });
            if (!loginRes.ok) {
                console.error("Login failed:", await loginRes.text());
                return;
            }
            const data = await loginRes.json();
            token = data.token;
        }

        const headers = {
            'Content-Type': 'application/json',
            'token': token
        };

        // 2. Add Attended Live (Assuming Live ID 1 exists)
        // Check if any lives exist first? No, assuming ID 1 from migration/seed.
        const liveId = 1;
        console.log(`Adding Live ID ${liveId} to attendance...`);
        const addRes = await fetch(`${BASE_URL}/users/me/attended_lives`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ liveId })
        });
        console.log("Add Response:", await addRes.text());

        // 3. Get Attended Lives
        console.log("Fetching Attended Lives...");
        const getRes = await fetch(`${BASE_URL}/users/me/attended_lives`, {
            headers: headers
        });
        const attendedLives = await getRes.json();
        console.log("Attended Lives Count:", attendedLives.length);
        if (attendedLives.length > 0) {
            console.log("First Live:", attendedLives[0]);
        }

        // 4. Delete Attended Live
        console.log(`Removing Live ID ${liveId}...`);
        const delRes = await fetch(`${BASE_URL}/users/me/attended_lives/${liveId}`, {
            method: 'DELETE',
            headers: headers
        });
        console.log("Delete Response:", await delRes.text());

        // 5. Verify Deletion
        const getRes2 = await fetch(`${BASE_URL}/users/me/attended_lives`, {
            headers: headers
        });
        const attendedLives2 = await getRes2.json();
        console.log("Attended Lives (After Delete):", attendedLives2.length);

    } catch (err) {
        console.error("Test Error:", err);
    }
}

testAttendanceAPI();
