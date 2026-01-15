/**
 * Script to populate songs table with all songs from the dictionary
 * Run with: node scripts/populate_songs_from_dictionary.js
 */

require('dotenv').config();
const db = require('../db');
const { songTranslations } = require('../utils/songTranslations');

async function populateSongs() {
    console.log('='.repeat(50));
    console.log('Starting to populate songs from dictionary...');
    console.log(`Dictionary contains ${Object.keys(songTranslations).length} entries`);
    console.log('='.repeat(50));

    // Get unique Japanese titles (values from dictionary)
    const uniqueTitles = [...new Set(Object.values(songTranslations))];
    console.log(`Found ${uniqueTitles.length} unique song titles to add`);

    let added = 0;
    let skipped = 0;
    let errors = 0;

    for (const title of uniqueTitles) {
        try {
            // Check if song already exists
            const existing = await db.query(
                'SELECT id FROM songs WHERE title = $1',
                [title]
            );

            if (existing.rows.length > 0) {
                skipped++;
                continue;
            }

            // Insert new song
            await db.query(
                'INSERT INTO songs (title) VALUES ($1)',
                [title]
            );
            console.log(`✅ Added: ${title}`);
            added++;

        } catch (err) {
            console.error(`❌ Error adding "${title}":`, err.message);
            errors++;
        }
    }

    console.log('='.repeat(50));
    console.log('Completed!');
    console.log(`  Added: ${added}`);
    console.log(`  Skipped (already exists): ${skipped}`);
    console.log(`  Errors: ${errors}`);
    console.log('='.repeat(50));

    process.exit(0);
}

populateSongs();
