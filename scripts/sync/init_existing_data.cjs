const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../server/.env') });
const { normalizeTitle, normalizeVenue, normalizeTourName, generateExternalSourceId, VERSION } = require('./normalize.cjs');

function toJSTDateString(date) {
    if (!date) return null;
    const d = new Date(date);
    d.setHours(d.getHours() + 9);
    return d.toISOString().split('T')[0];
}

async function init() {
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    await client.connect();

    try {
        const res = await client.query('SELECT id, date, title, venue, tour_name, is_manually_edited, source FROM lives');
        console.log(`Processing ${res.rows.length} existing records...`);

        for (const row of res.rows) {
            const dateStr = toJSTDateString(row.date);
            const rawTour = row.tour_name || row.title || '';
            const rawTitle = row.title || '';

            const normTour = normalizeTourName(rawTour);
            const normTitle = normalizeTitle(rawTitle);
            const normVenue = normalizeVenue(row.venue);
            const hashId = generateExternalSourceId(dateStr, rawTour, row.venue, rawTitle);

            await client.query(
                `UPDATE lives SET 
                    normalized_tour_name = $1,
                    normalized_title = $2, 
                    normalized_venue = $3, 
                    external_source_id = $4,
                    normalization_version = $5
                 WHERE id = $6`,
                [normTour, normTitle, normVenue, hashId, VERSION, row.id]
            );
        }

        console.log('Successfully initialized existing records.');
    } catch (err) {
        console.error('Error during initialization:', err);
    } finally {
        await client.end();
    }
}

init();
