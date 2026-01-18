const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Song mapping for spelling variations
const songMappings = {
    // Re-use previous mappings
    "奏全域": "奏全域", "Sou Zen'iki": "奏全域", "Kanzen’iki": "奏全域",
    "ANOMALY奏者": "ANOMALY奏者", "ANOMALY Soshisha": "ANOMALY奏者",
    "若さ故エンテレケイア": "若さ故エンテレケイア",
    "神集め": "神集め",
    "僕の言葉ではない これは僕達の言葉": "僕の言葉ではない これは僕達の言葉",
    "Boku no Kotoba de wa Nai Kore wa Bokutachi no Kotoba": "僕の言葉ではない これは僕達の言葉",
    "一石を投じる Tokyo midnight sun": "一石を投じる　Tokyo midnight sun",
    "Isseki wo Toujiru Tokyo midnight sun": "一石を投じる　Tokyo midnight sun",
    "シャカビーチ〜Laka Laka La〜": "シャカビーチ〜Laka Laka La〜",
    "来鳥江": "来鳥江",
    "ace of ace1 〜LIVE intro ver. 〜": "ace of ace", "ace of ace": "ace of ace", "ace of ace ～LIVE intro ver.～": "ace of ace", "ace of ace [Live intro ver.]": "ace of ace",
    "〜流れ・空虚・THIS WORD〜": "〜流れ・空虚・THIS WORD〜",
    "美影意志": "美影意志", "Mikage-Ishi": "美影意志",
    "撃破": "撃破",
    "君の好きなうた": "君の好きなうた",
    "浮世CROSSING": "浮世CROSSING", "Ukiyo Crossing": "浮世CROSSING",
    "トキノナミダ": "トキノナミダ",
    "在るべき形": "在るべき形", "Arubeki Katachi": "在るべき形",
    "シリウス": "シリウス", "Sirius": "シリウス",
    "ピグマリオン": "ピグマリオン", "Pygmalion": "ピグマリオン",
    "EDENへ": "EDENへ", "EDEN e": "EDENへ", "EDEN": "EDENへ",
    "7日目の決意": "7日目の決意", "7-nichime no Ketsui": "7日目の決意",
    "えくぼ": "えくぼ", "Ekubo": "えくぼ",
    "マダラ蝶": "マダラ蝶", "Madara Cho": "マダラ蝶",
    "恋いしくて": "恋いしくて", "Koi Shikute": "恋いしくて",
    "誰が言った": "誰が言った", "Dare ga Itta": "誰が言った",
    "ai ta心": "ai ta心", "ai ta kokoro": "ai ta心",
    "徒労": "徒労", "Totou": "徒労",
    "パニックワールド": "パニックワールド", "Panic World": "パニックワールド",
    "Zero HERE ～SE～": "零HERE ~SE~", "Zero HERE ~SE~": "零HERE ~SE~"
};

const setlistsData = [
    {
        date: '2022-06-06',
        venue: 'Zepp Osaka Bayside',
        type: 'Day', // or check tour_name/time
        songs: [
            "NEVER ENDING WORLD", "AVALANCHE", "CORE PRIDE", "stay on", "PLOT",
            "EDENへ", "在るべき形", "シリウス", "ace of ace", "Making it Drive",
            "PRAYING RUN", "THUG LIFE", "僕の言葉ではない これは僕達の言葉", "THE OVER",
            "ピグマリオン", "Touch off", "IMPACT", "AFTER LIFE", "EN",
            "One stroke for freedom", "7th Trigger", "MONDO PIECE"
        ]
    },
    {
        date: '2022-06-06',
        venue: 'Zepp Osaka Bayside',
        type: 'Night',
        songs: [
            "NEVER ENDING WORLD", "AVALANCHE", "Fight For Liberty", "浮世CROSSING", "誰が言った",
            "在るべき形", "Q.E.D.", "シリウス", "PLOT", "THUG LIFE",
            "earthy world", "GOOD and EVIL", "マダラ蝶", "恋いしくて", "NAMELY",
            "Spreadown", "ace of ace", "Making it Drive", "PRAYING RUN", "Touch off",
            "EN", "One stroke for freedom", "AFTER LIFE", "MONDO PIECE"
        ]
    },
    {
        date: '2022-07-20',
        venue: '日本武道館',
        songs: [
            "NEVER ENDING WORLD", "AVALANCHE", "CORE PRIDE", "stay on", "PLOT",
            "EDENへ", "在るべき形", "シリウス", "ace of ace", "Making it Drive",
            "PRAYING RUN", "THUG LIFE", "僕の言葉ではない これは僕達の言葉", "THE OVER",
            "ピグマリオン", "Touch off", "IMPACT", "AFTER LIFE", "EN",
            "One stroke for freedom", "7日目の決意", "MONDO PIECE"
        ]
    },
    {
        date: '2022-07-21',
        venue: '日本武道館',
        songs: [
            "NEVER ENDING WORLD", "AVALANCHE", "I LOVE THE WORLD", "stay on", "PLOT",
            "ENOUGH-1", "在るべき形", "シリウス", "Q.E.D.", "Massive",
            "ConneQt", "PRAYING RUN", "Touch off", "IMPACT", "AFTER LIFE",
            "EN", "One stroke for freedom", "MONDO PIECE"
        ]
    },
    {
        date: '2022-08-12',
        venue: '千葉市蘇我スポーツ公園', // ROCK IN JAPAN FESTIVAL
        songs: [
            "NEVER ENDING WORLD", "IMPACT", "AVALANCHE", "stay on", "Making it Drive",
            "PRAYING RUN", "Touch off", "EN", "7日目の決意", "One stroke for freedom",
            "AFTER LIFE", "ピグマリオン"
        ]
    },
    {
        date: '2022-09-25', // Seika Birthday
        venue: 'Zepp Haneda',
        special_note: '誠果 生誕祭',
        songs: [
            "KINJITO", "BABY BORN & GO", "stay on", "PLOT", "在るべき形",
            "CORE PRIDE", "Making it Drive", "PRAYING RUN", "えくぼ", "ConneQt",
            "ANOMALY奏者", "LIMITLESS", "Zero HERE ～SE～", "IMPACT", "Touch off",
            "EN", "One stroke for freedom", "ピグマリオン"
        ]
    },
    {
        date: '2022-11-30',
        venue: 'KT Zepp Yokohama',
        songs: [
            "NEVER ENDING WORLD", "Burst", "BABY BORN & GO", "奏全域", "パニックワールド",
            "ai ta心", "AVALANCHE", "一石を投じる Tokyo midnight sun", "徒労"
            // Note: Setlist might be incomplete in source, but adding what we found.
        ]
    }
];

// Helper to normalize title
function normalize(title) {
    if (songMappings[title]) return songMappings[title];
    return title.trim();
}

async function runSeed() {
    console.log("Starting bulk setlist seed for Jun-Nov 2022...");
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        for (const data of setlistsData) {
            console.log(`Processing ${data.date} @ ${data.venue}`);

            // 1. Find the Live ID
            let res = await client.query(
                `SELECT id, tour_name FROM lives 
                 WHERE date = $1 AND (venue LIKE $2 OR tour_name LIKE $2 OR special_note LIKE $2)
                 ORDER BY id ASC`,
                [data.date, `%${data.venue}%`] // Trying venue match first
            );

            // Fallback for festivals (venue might differ in DB, e.g. "Soga Sports Park" vs "Rock in Japan")
            if (res.rows.length === 0 && data.venue === '千葉市蘇我スポーツ公園') {
                res = await client.query(
                    `SELECT id, tour_name FROM lives WHERE date = $1`, [data.date]
                );
            }

            let liveId;
            if (res.rows.length === 0) {
                console.warn(`  Live not found for ${data.date}! Skipping...`);
                // Optional: Create it?
                continue;
            } else if (res.rows.length > 1) {
                if (data.type) {
                    const index = (data.type.includes('Day')) ? 0 : 1;
                    if (res.rows[index]) {
                        liveId = res.rows[index].id;
                        console.log(`  Matched multiple events, selected index ${index} (ID: ${liveId})`);
                    } else {
                        liveId = res.rows[0].id;
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
                    songRes = await client.query('SELECT id FROM songs WHERE title = $1', [title]);
                }

                if (songRes.rows.length > 0) {
                    songIds.push(songRes.rows[0].id);
                } else {
                    console.warn(`  Song not found: "${rawTitle}" (Normalized: "${title}") - Creating it.`);
                    // Create new song
                    const newSong = await client.query(
                        'INSERT INTO songs (title, author, release_year) VALUES ($1, $2, $3) RETURNING id',
                        [title, 'UVERworld', 2022]
                    );
                    songIds.push(newSong.rows[0].id);
                }
            }

            // 3. Update Setlist
            await client.query('DELETE FROM setlists WHERE live_id = $1', [liveId]);

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
