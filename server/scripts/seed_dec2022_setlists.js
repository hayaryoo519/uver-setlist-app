const { Pool } = require('pg');
require('dotenv').config(); // Load from current directory (server/.env)

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Song mapping for spelling variations
const songMappings = {
    "奏全域": "奏全域",
    "Sou Zen'iki": "奏全域",
    "ANOMALY奏者": "ANOMALY奏者",
    "ANOMALY sousha": "ANOMALY奏者",
    "若さ故エンテレケイア": "若さ故エンテレケイア",
    "Wakasa Yue Enterekeia": "若さ故エンテレケイア",
    "神集め": "神集め",
    "Kami Atsume": "神集め",
    "僕の言葉ではない これは僕達の言葉": "僕の言葉ではない これは僕達の言葉",
    "Boku no Kotoba ...": "僕の言葉ではない これは僕達の言葉",
    "Boku no Kotoba de wa Nai Kore wa Bokutachi no Kotoba": "僕の言葉ではない これは僕達の言葉",
    "一石を投じる Tokyo midnight sun": "一石を投じる　Tokyo midnight sun",
    "Isseki wo Toujiru Tokyo midnight sun": "一石を投じる　Tokyo midnight sun",
    "シャカビーチ〜Laka Laka La〜": "シャカビーチ〜Laka Laka La〜",
    "Shaka Beach: Laka Laka La": "シャカビーチ〜Laka Laka La〜",
    "来鳥江": "来鳥江",
    "Raichō-e": "来鳥江",
    "ace of ace1 〜LIVE intro ver. 〜": "ace of ace", // Approx
    "ace of ace": "ace of ace",
    "〜流れ・空虚・THIS WORD〜": "〜流れ・空虚・THIS WORD〜",
    "~Nagare Kūkyo THIS WORD~": "〜流れ・空虚・THIS WORD〜",
    "美影意志": "美影意志",
    "Mikage-Ishi": "美影意志",
    "撃破": "撃破",
    "Gekiha": "撃破",
    "君の好きなうた": "君の好きなうた",
    "Kimi no Suki na Uta": "君の好きなうた",
    "浮世CROSSING": "浮世CROSSING",
    "トキノナミダ": "トキノナミダ",
    "Toki no Namida": "トキノナミダ",
    ".über cozy universe": ".über cozy universe",
    "Uberworld": ".über cozy universe",
    "Eye's Sentry": "Eye's Sentry",
    "High Light!": "High Light!",
    "Theory": "Theory"
};

const setlistsData = [
    {
        date: '2022-12-20',
        venue: '横浜アリーナ',
        songs: [
            "NEVER ENDING WORLD", "AVALANCHE", "UNKNOWN ORCHESTRA", "Touch off", "IMPACT",
            "GO-ON", "一石を投じる Tokyo midnight sun", "Burst", "来鳥江", "THUG LIFE",
            "僕の言葉ではない これは僕達の言葉", "CORE PRIDE", "ALL ALONE", "Ø choir", "君の好きなうた",
            "ピグマリオン", "Massive", "One stroke for freedom", "奏全域", "EMPTY96", "AS ONE", "EN", "Theory"
        ]
    },
    {
        date: '2022-12-21',
        venue: '横浜アリーナ',
        special_note: 'TAKUYA∞ 生誕祭',
        songs: [
            "NEVER ENDING WORLD", "7th Trigger", "CORE PRIDE", "ナノ・セカンド", "IMPACT",
            "AFTER LIFE", "在るべき形", "AVALANCHE", "Making it Drive", "One Last Time",
            "ENOUGH-1", "WE ARE GO", "〜流れ・空虚・THIS WORD〜", "a LOVELY TONE", "THE OVER",
            "ピグマリオン", "Massive", "One stroke for freedom", "Don't Think.Feel", "PRAYING RUN",
            "Touch off", "EN", "Theory"
        ]
    },
    {
        date: '2022-12-25',
        venue: '日本武道館',
        type: 'Day', // Heuristic to distinguish if multiple same date
        songs: [
            "NEVER ENDING WORLD", "Touch off", "ODD FUTURE", "AS ONE", "奏全域",
            "IMPACT", "浮世CROSSING", "EDENへ", "トキノナミダ", "THUG LIFE",
            "僕の言葉ではない これは僕達の言葉", "One Last Time", "〜流れ・空虚・THIS WORD〜", "NAMELY", "a LOVELY TONE",
            "ピグマリオン", "ANOMALY奏者", "One stroke for freedom", "I LOVE THE WORLD", "一滴の影響",
            "Roots", "EN", "Theory"
        ]
    },
    {
        date: '2022-12-25',
        venue: '日本武道館',
        type: 'Night',
        songs: [
            "NEVER ENDING WORLD", "KINJITO", "SHAMROCK", "ナノ・セカンド", "stay on",
            "IMPACT", "CHANCE!", "在るべき形", "AVALANCHE", "GO-ON",
            "ROB THE FRONTIER", "CORE PRIDE", "Ø choir", "BVCK", "君の好きなうた",
            "ピグマリオン", "ANOMALY奏者", "One stroke for freedom", "PRAYING RUN", "Touch off",
            "AFTER LIFE", "EN", "Theory"
        ]
    },
    {
        date: '2022-12-30',
        venue: 'マリンメッセ福岡',
        songs: [
            "NEVER ENDING WORLD", "7th Trigger", "GOLD", "ODD FUTURE", "奏全域",
            "Roots", "BVCK", "AVALANCHE", "Wizard CLUB", "ace of ace",
            "THUG LIFE", "One Last Time", "〜流れ・空虚・THIS WORD〜", "シリウス", "美影意志",
            "THE OVER", "ピグマリオン", "ANOMALY奏者", "One stroke for freedom", "僕の言葉ではない これは僕達の言葉",
            "一滴の影響", "EN", "Theory"
        ]
    },
    {
        date: '2022-12-31',
        venue: 'マリンメッセ福岡',
        type: 'Part 1',
        songs: [
            "NEVER ENDING WORLD", "CHANCE!", "SHAMROCK", "Don't Think.Feel", "ナノ・セカンド",
            "CORE PRIDE", "IMPACT", "Burst", "一石を投じる Tokyo midnight sun", "トキノナミダ",
            "Colors of the Heart", "撃破", "浮世CROSSING", "君の好きなうた", "ANOMALY奏者",
            "GO-ON", "僕の言葉ではない これは僕達の言葉", "AS ONE", "NO.1", "EN", "Theory"
        ]
    },
    {
        date: '2022-12-31',
        venue: 'マリンメッセ福岡',
        type: 'Part 2',
        songs: [
            "NEVER ENDING WORLD", "AVALANCHE", "BABY BORN & GO", "REVERSI", "WE ARE GO",
            "IMPACT", "在るべき形", "ace of ace", "One Last Time", "earthy world",
            "〜流れ・空虚・THIS WORD〜", "WANNA be BRILLIANT", "ALL ALONE", "NAMELY", "AFTER LIFE",
            "ピグマリオン", "Massive", "Making it Drive", "One stroke for freedom", "PRAYING RUN",
            "Touch off", "EN", "Theory"
        ]
    }
];

// Helper to normalize title
function normalize(title) {
    if (songMappings[title]) return songMappings[title];
    // Remove "SE" or similar prefix if needed, but dictionary is safer
    return title.trim();
}

async function runSeed() {
    console.log("Starting bulk setlist seed for Dec 2022...");
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        for (const data of setlistsData) {
            console.log(`Processing ${data.date} @ ${data.venue} (${data.type || 'Single'})`);

            // 1. Find the Live ID
            let res = await client.query(
                `SELECT id, tour_name FROM lives 
                 WHERE date = $1 AND venue LIKE $2 
                 ORDER BY id ASC`, // Simple heuristic
                [data.date, `%${data.venue}%`]
            );

            let liveId;
            if (res.rows.length === 0) {
                console.warn(`  Live not found for ${data.date}! Skipping...`);
                continue;
            } else if (res.rows.length > 1) {
                // Determine Day/Night or Part 1/2
                if (data.type) {
                    // Assuming created_at order matches schedule (Day first, then Night)
                    // Or check special_note/time if available. 
                    // For now, assuming index 0 is first show, index 1 is second show.
                    const index = (data.type.includes('Day') || data.type.includes('Part 1')) ? 0 : 1;
                    if (res.rows[index]) {
                        liveId = res.rows[index].id;
                        console.log(`  Matched multiple events, selected index ${index} (ID: ${liveId})`);
                    } else {
                        liveId = res.rows[0].id; // Fallback
                        console.log(`  Fallback to first event (ID: ${liveId})`);
                    }
                } else {
                    liveId = res.rows[0].id;
                }
            } else {
                liveId = res.rows[0].id;
            }

            // 2. Prepare Setlist Songs
            const songIds = [];
            for (const rawTitle of data.songs) {
                const title = normalize(rawTitle);

                // Find Song ID
                let songRes = await client.query('SELECT id FROM songs WHERE title ILIKE $1', [title]);

                if (songRes.rows.length === 0) {
                    // Try exact match search
                    songRes = await client.query('SELECT id FROM songs WHERE title = $1', [title]);
                }

                if (songRes.rows.length > 0) {
                    songIds.push(songRes.rows[0].id);
                } else {
                    console.warn(`  Song not found: "${rawTitle}" (Normalized: "${title}") - Creating it.`);
                    // Create new song
                    const newSong = await client.query(
                        'INSERT INTO songs (title, author, release_year) VALUES ($1, $2, $3) RETURNING id',
                        [title, 'UVERworld', 2022] // Approximating year
                    );
                    songIds.push(newSong.rows[0].id);
                }
            }

            // 3. Update Setlist
            // Clear existing
            await client.query('DELETE FROM setlists WHERE live_id = $1', [liveId]);

            // Insert new
            let position = 1;
            for (const sId of songIds) {
                await client.query(
                    'INSERT INTO setlists (live_id, song_id, position) VALUES ($1, $2, $3)',
                    [liveId, sId, position++]
                );
            }
            console.log(`  Updated setlist for Live ID ${liveId} with ${songIds.length} songs.`);
        }

        await client.query('COMMIT');
        console.log("Seeding complete!");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error seeding setlists:", err);
    } finally {
        client.release();
        pool.end();
    }
}

runSeed();
