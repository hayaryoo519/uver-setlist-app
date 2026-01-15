require('dotenv').config();
const axios = require('axios');

const UVER_MBID = '1f534f37-d284-4866-a36c-9dddd008e31a';
const SETLIST_FM_API_URL = 'https://api.setlist.fm/rest/1.0';
const API_KEY = process.env.SETLIST_FM_API_KEY;

console.log('Testing setlist.fm API...');
console.log('MBID:', UVER_MBID);
console.log('API Key (first 5 chars):', API_KEY ? API_KEY.substring(0, 5) + '...' : 'UNDEFINED');

console.log('--- TEST 1: Direct Artist Endpoint ---');
async function testDirectEndpoint() {
    try {
        const response = await axios.get(`${SETLIST_FM_API_URL}/artist/${UVER_MBID}/setlists`, {
            headers: { 'x-api-key': API_KEY, 'Accept': 'application/json' }
        });
        console.log('Direct Endpoint Success! Found:', response.data.setlist?.length || 0, 'setlists');
    } catch (err) {
        console.error('Direct Endpoint Failed:', err.response?.status, err.response?.statusText);
    }
}

console.log('--- TEST 2: Search by Name "UVERworld" ---');
async function testSearchByName() {
    try {
        const response = await axios.get(`${SETLIST_FM_API_URL}/search/setlists`, {
            params: { artistName: 'UVERworld', year: '2023' },
            headers: { 'x-api-key': API_KEY, 'Accept': 'application/json' }
        });
        console.log('Search by Name Success! Found:', response.data.setlist?.length || 0, 'setlists');
    } catch (err) {
        console.error('Search by Name Failed:', err.response?.status, err.response?.statusText);
    }
}

console.log('--- TEST 3: Search by MBID (Original) ---');
async function testSearchByMbid() {
    try {
        const response = await axios.get(`${SETLIST_FM_API_URL}/search/setlists`, {
            params: { artistMbid: UVER_MBID, year: '2023' },
            headers: { 'x-api-key': API_KEY, 'Accept': 'application/json' }
        });
        console.log('Search by MBID Success! Found:', response.data.setlist?.length || 0, 'setlists');
    } catch (err) {
        console.error('Search by MBID Failed:', err.response?.status, err.response?.statusText);
        if (err.response?.status === 404) {
            console.log('  -> 404 confirmed for MBID search. Parameter name might be wrong or API behavior unexpected.');
        }
    }
}

async function runTests() {
    await testDirectEndpoint();
    await testSearchByName();
    await testSearchByMbid();
}

runTests();
