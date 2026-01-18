const axios = require('axios');

const API_KEY = '7hxEh_0bihCDwLTbRxu_9Bs3aXn7ddofdPDH';
const ARTIST_NAME = 'UVERworld';
const YEAR = 2024;

async function fetchSetlists() {
    try {
        let page = 1;
        let found = false;

        while (!found && page <= 10) {
            console.log(`Fetching page ${page}...`);
            const res = await axios.get(`https://api.setlist.fm/rest/1.0/search/setlists`, {
                params: {
                    artistName: ARTIST_NAME,
                    year: YEAR,
                    p: page
                },
                headers: {
                    'x-api-key': API_KEY,
                    'Accept': 'application/json'
                }
            });

            if (res.data.setlist) {
                const target = res.data.setlist.find(s => s.eventDate === '28-12-2024');
                if (target) {
                    const fs = require('fs');
                    fs.writeFileSync('debug_output.json', JSON.stringify(target, null, 2));
                    console.log('--- FOUND TARGET SETLIST (12/28) - Saved to debug_output.json ---');
                    found = true;
                }
            }

            if (!found) {
                const total = res.data.total;
                const perPage = res.data.itemsPerPage;
                if (page * perPage >= total) break;
                page++;
            }
        }

    } catch (err) {
        console.error('Error:', err.message);
        if (err.response) console.error(err.response.data);
    }
}

fetchSetlists();
