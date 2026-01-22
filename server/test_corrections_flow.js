const fetch = require('node-fetch');
const { execSync } = require('child_process');

const BASE_URL = 'http://localhost:4000/api';
let token = '';
let userId = '';
let correctionId = '';

async function runTest() {
    console.log('--- Starting Correction Feature Test ---');

    // 1. Register/Login User (Creating a temporary admin for test)
    const email = `test_admin_${Date.now()}@example.com`;
    const password = 'password123';

    console.log(`1. Registering user: ${email}`);
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'TestAdmin', email, password })
    });
    const regData = await regRes.json();

    if (!regRes.ok) {
        console.error('Registration failed:', regData);
        return;
    }
    token = regData.token;
    userId = regData.user.id;
    console.log('   Registration successful. Token acquired.');

    // 2. Create Correction Request
    console.log('2. Creating correction request (User)');
    const createRes = await fetch(`${BASE_URL}/corrections`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'token': token
        },
        body: JSON.stringify({
            correction_type: 'setlist',
            description: 'Test correction description ' + Date.now(),
            live_venue: 'Test Venue',
            live_date: '2025-01-01',
            live_title: 'Test Live'
        })
    });
    const createData = await createRes.json();

    if (createRes.ok) {
        console.log('   Creation successful:', createData);
        correctionId = createData.correction_id;
    } else {
        console.error('   Creation failed:', createData);
        return;
    }

    // 3. Promote user to admin to test admin endpoints
    console.log('3. Promoting user to Admin');
    try {
        execSync(`node promote_admin.js ${email}`, { stdio: 'inherit' });
    } catch (e) {
        console.error('Failed to promote user via script:', e);
        return;
    }

    console.log('   Logging in again to refresh role...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const loginData = await loginRes.json();
    if (loginRes.ok) {
        token = loginData.token;
        console.log('   Re-login successful. New Token acquired.');
    } else {
        console.error('   Re-login failed:', loginData);
        return;
    }

    console.log('4. Fetching corrections (Admin)');
    const getRes = await fetch(`${BASE_URL}/corrections`, {
        headers: { 'token': token }
    });

    if (getRes.ok) {
        const getData = await getRes.json();
        console.log(`   Fetch successful. Found ${getData.corrections.length} corrections.`);
        const myCorrection = getData.corrections.find(c => c.id === correctionId);
        if (myCorrection) {
            console.log('   Found created correction:', myCorrection.id, myCorrection.status);
        } else {
            console.error('   Created correction NOT found in list!');
        }
    } else {
        console.log('   Fetch failed:', getRes.status);
        return;
    }

    console.log('5. Updating correction status (Admin)');
    const patchRes = await fetch(`${BASE_URL}/corrections/${correctionId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'token': token
        },
        body: JSON.stringify({
            status: 'resolved',
            admin_note: 'Fixed via test script'
        })
    });

    if (patchRes.ok) {
        const patchData = await patchRes.json();
        console.log('   Update successful:', patchData);
        if (patchData.correction.status === 'resolved') {
            console.log('   Status verified: resolved');
        } else {
            console.error('   Status mismatch:', patchData.correction.status);
        }
    } else {
        console.log('   Update failed:', patchRes.status);
    }

    console.log('--- Test Finished (Complete) ---');
    console.log(`User Email: ${email}`);

    // 6. Structured Data Test
    console.log('6. Creating correction with structured data (User)');
    const structRes = await fetch(`${BASE_URL}/corrections`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'token': token
        },
        body: JSON.stringify({
            correction_type: 'setlist',
            description: 'Structured Data Test',
            suggested_data: {
                setlist: [
                    { songId: 101, songTitle: 'Test Song A', clean: 'Test Song A', original: '1. Test Song A' },
                    { songId: 102, songTitle: 'Test Song B', clean: 'Test Song B', original: '2. Test Song B' }
                ]
            }
        })
    });

    if (structRes.ok) {
        const structData = await structRes.json();
        console.log('   Creation with structured data successful:', structData);

        // Use the same admin token to verify it exists
        const verifyRes = await fetch(`${BASE_URL}/corrections`, {
            headers: { 'token': token }
        });
        const verifyData = await verifyRes.json();
        const target = verifyData.corrections.find(c => c.id === structData.correction_id);

        if (target && target.suggested_data && target.suggested_data.setlist && target.suggested_data.setlist.length === 2) {
            console.log('   Verification successful: suggested_data persisted correctly');
        } else {
            console.error('   Verification failed: suggested_data missing or incorrect', target);
        }

    } else {
        console.error('   Creation with structured data failed:', await structRes.json());
    }
}

runTest();
