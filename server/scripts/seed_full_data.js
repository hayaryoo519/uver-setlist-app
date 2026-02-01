const { pool } = require('./db');
const fs = require('fs');
const path = require('path');

const lives = [
    {
        id: "live_20231221_01",
        date: "2023-12-21",
        venue: "横浜アリーナ",
        type: "Arena",
        prefecture: "Kanagawa",
        tourTitle: "UVERworld ENIGMASIS TOUR",
    },
    {
        id: "live_20230729_01",
        date: "2023-07-29",
        venue: "日産スタジアム",
        type: "Arena",
        prefecture: "Kanagawa",
        tourTitle: "UVERworld KING'S PARADE 男祭り REBORN",
    },
    {
        id: "live_20230730_01",
        date: "2023-07-30",
        venue: "日産スタジアム",
        type: "Arena",
        prefecture: "Kanagawa",
        tourTitle: "UVERworld PREMIUM LIVE on Xmas 2023",
    },
    {
        id: "live_20221203_01",
        date: "2022-12-03",
        venue: "Zepp Haneda",
        type: "LiveHouse",
        prefecture: "Tokyo",
        tourTitle: "UVERworld LIVE HOUSE TOUR 2022",
    },
    {
        id: "live_20220812_01",
        date: "2022-08-12",
        venue: "Example Fes Grounds",
        type: "Festival",
        prefecture: "Hokkaido",
        tourTitle: "RISING SUN ROCK FESTIVAL 2022",
    },
    {
        id: "live_20211225_01",
        date: "2021-12-25",
        venue: "日本武道館",
        type: "Arena",
        prefecture: "Tokyo",
        tourTitle: "UVERworld Premium Live 2021",
    },
    {
        id: "live_20230615_01",
        date: "2023-06-15",
        venue: "大阪城ホール",
        type: "Arena",
        prefecture: "Osaka",
        tourTitle: "UVERworld ENIGMASIS TOUR",
    },
    {
        id: "live_20230520_01",
        date: "2023-05-20",
        venue: "マリンメッセ福岡",
        type: "Arena",
        prefecture: "Fukuoka",
        tourTitle: "UVERworld ENIGMASIS TOUR",
    },
    {
        id: "live_20230408_01",
        date: "2023-04-08",
        venue: "さいたまスーパーアリーナ",
        type: "Arena",
        prefecture: "Saitama",
        tourTitle: "UVERworld ENIGMASIS TOUR",
    },
    {
        id: "live_20230312_01",
        date: "2023-03-12",
        venue: "Zepp Tokyo",
        type: "LiveHouse",
        prefecture: "Tokyo",
        tourTitle: "UVERworld LIVE HOUSE TOUR 2023",
    },
    {
        id: "live_20221120_01",
        date: "2022-11-20",
        venue: "名古屋ガイシホール",
        type: "Arena",
        prefecture: "Aichi",
        tourTitle: "UVERworld KING'S PARADE 2022",
    },
    {
        id: "live_20221015_01",
        date: "2022-10-15",
        venue: "幕張メッセ",
        type: "Arena",
        prefecture: "Chiba",
        tourTitle: "UVERworld KING'S PARADE 2022",
    },
    {
        id: "live_20220918_01",
        date: "2022-09-18",
        venue: "神戸ワールド記念ホール",
        type: "Arena",
        prefecture: "Hyogo",
        tourTitle: "UVERworld KING'S PARADE 2022",
    },
    {
        id: "live_20220725_01",
        date: "2022-07-25",
        venue: "Zepp Osaka Bayside",
        type: "LiveHouse",
        prefecture: "Osaka",
        tourTitle: "UVERworld LIVE HOUSE TOUR 2022",
    },
    {
        id: "live_20220610_01",
        date: "2022-06-10",
        venue: "Zepp Nagoya",
        type: "LiveHouse",
        prefecture: "Aichi",
        tourTitle: "UVERworld LIVE HOUSE TOUR 2022",
    },
    {
        id: "live_20211218_01",
        date: "2021-12-18",
        venue: "横浜アリーナ",
        type: "Arena",
        prefecture: "Kanagawa",
        tourTitle: "UVERworld Premium Live 2021",
    },
    {
        id: "live_20211010_01",
        date: "2021-10-10",
        venue: "大阪城ホール",
        type: "Arena",
        prefecture: "Osaka",
        tourTitle: "UVERworld TYCOON TOUR",
    },
    {
        id: "live_20210815_01",
        date: "2021-08-15",
        venue: "さいたまスーパーアリーナ",
        type: "Arena",
        prefecture: "Saitama",
        tourTitle: "UVERworld TYCOON TOUR",
    },
    {
        id: "live_20200229_01",
        date: "2020-02-29",
        venue: "日本武道館",
        type: "Arena",
        prefecture: "Tokyo",
        tourTitle: "UVERworld UNSER TOUR",
    },
    {
        id: "live_20191225_01",
        date: "2019-12-25",
        venue: "横浜アリーナ",
        type: "Arena",
        prefecture: "Kanagawa",
        tourTitle: "UVERworld Premium Live 2019",
    },
];

const setlists = {
    "live_20231221_01": [
        { order: 1, title: "ENIGMASIS" },
        { order: 2, title: "VICTOSPIN" },
        { order: 3, title: "ナノ・セカンド" },
        { order: 4, title: "CORE PRIDE" },
        { order: 5, title: "No.1" },
        { order: 6, title: "ビタースウィート" },
        { order: 7, title: "CHANCE!" },
        { order: 8, title: "Q.E.D." },
        { order: 9, title: "シリウス" },
        { order: 10, title: "Gold" },
        { order: 11, title: "Don't Think. Sing" },
        { order: 12, title: "PRAYING RUN" },
        { order: 13, title: "Touch off" },
        { order: 14, title: "EN" },
        { order: 15, title: "Theory" },
        { order: 16, title: "AFTER LIFE" },
        { order: 17, title: "7th Trigger" },
        { order: 18, title: "MONDO PIECE", note: "Encore" },
    ],
    "live_20230729_01": [
        { order: 1, title: "ENIGMASIS" },
        { order: 2, title: "Don't Think. Sing" },
        { order: 3, title: "ナノ・セカンド" },
        { order: 4, title: "7th Trigger" },
        { order: 5, title: "FIGHT FOR LIBERTY" },
        { order: 6, title: "KINJITO" },
        { order: 7, title: "FINAL ISTV" },
        { order: 8, title: "VICTOSPIN" },
        { order: 9, title: "CHANCE!" },
        { order: 10, title: "Q.E.D." },
        { order: 11, title: "シリウス" },
        { order: 12, title: "Gold" },
        { order: 13, title: "CORE PRIDE" },
        { order: 14, title: "Touch off" },
        { order: 15, title: "AFTER LIFE" },
        { order: 16, title: "EN" },
        { order: 17, title: "Theory" },
        { order: 18, title: "MONDO PIECE", note: "Encore" },
    ],
    "live_20221203_01": [
        { order: 1, title: "Touch off" },
        { order: 2, title: "IMPACT" },
        { order: 3, title: "AFTER LIFE" },
        { order: 4, title: "PRAYING RUN" },
        { order: 5, title: "EN" }
    ],
    "live_20220812_01": [
        { order: 1, title: "7th Trigger" },
        { order: 2, title: "CORE PRIDE" },
        { order: 3, title: "IMPACT" }
    ],
    "live_20211225_01": [
        { order: 1, title: "AVALANCHE" },
        { order: 2, title: "Making it Drive" },
        { order: 3, title: "One Last Time" }
    ],
    "live_20230615_01": [
        { order: 1, title: "ENIGMASIS" },
        { order: 2, title: "CORE PRIDE" },
        { order: 3, title: "7th Trigger" },
        { order: 4, title: "Touch off" },
        { order: 5, title: "VICTOSPIN" }
    ],
    "live_20230520_01": [
        { order: 1, title: "ENIGMASIS" },
        { order: 2, title: "CORE PRIDE" },
        { order: 3, title: "ナノ・セカンド" },
        { order: 4, title: "AFTER LIFE" }
    ],
    "live_20230408_01": [
        { order: 1, title: "ENIGMASIS" },
        { order: 2, title: "7th Trigger" },
        { order: 3, title: "CORE PRIDE" },
        { order: 4, title: "Don't Think. Sing" }
    ],
    "live_20230312_01": [
        { order: 1, title: "CORE PRIDE" },
        { order: 2, title: "ENIGMASIS" },
        { order: 3, title: "Touch off" }
    ],
    "live_20221120_01": [
        { order: 1, title: "CORE PRIDE" },
        { order: 2, title: "7th Trigger" },
        { order: 3, title: "VICTOSPIN" }
    ],
    "live_20221015_01": [
        { order: 1, title: "CORE PRIDE" },
        { order: 2, title: "ENIGMASIS" },
        { order: 3, title: "AFTER LIFE" }
    ],
    "live_20220918_01": [
        { order: 1, title: "CORE PRIDE" },
        { order: 2, title: "Touch off" },
        { order: 3, title: "7th Trigger" }
    ],
    "live_20220725_01": [
        { order: 1, title: "CORE PRIDE" },
        { order: 2, title: "ENIGMASIS" },
        { order: 3, title: "VICTOSPIN" }
    ],
    "live_20220610_01": [
        { order: 1, title: "CORE PRIDE" },
        { order: 2, title: "7th Trigger" },
        { order: 3, title: "Touch off" }
    ],
    "live_20211218_01": [
        { order: 1, title: "CORE PRIDE" },
        { order: 2, title: "ENIGMASIS" },
        { order: 3, title: "AFTER LIFE" }
    ],
    "live_20211010_01": [
        { order: 1, title: "CORE PRIDE" },
        { order: 2, title: "7th Trigger" },
        { order: 3, title: "VICTOSPIN" }
    ],
    "live_20210815_01": [
        { order: 1, title: "CORE PRIDE" },
        { order: 2, title: "Touch off" },
        { order: 3, title: "ENIGMASIS" }
    ],
    "live_20200229_01": [
        { order: 1, title: "CORE PRIDE" },
        { order: 2, title: "7th Trigger" },
        { order: 3, title: "AFTER LIFE" }
    ],
    "live_20191225_01": [
        { order: 1, title: "CORE PRIDE" },
        { order: 2, title: "ENIGMASIS" },
        { order: 3, title: "Touch off" }
    ]
};

async function seed() {
    console.log("Starting data migration...");
    const client = await pool.connect();

    // ID Mapping: JS_ID -> DB_ID
    const idMap = new Map();

    try {
        await client.query('BEGIN');

        // Ensure Unique Index on songs(title) for ON CONFLICT to work
        await client.query("CREATE UNIQUE INDEX IF NOT EXISTS songs_title_idx ON songs (title);");

        // 1. Insert/Upsert Lives
        for (const live of lives) {
            console.log(`Processing live: ${live.id}`);

            // Check existence logic
            const checkQuery = `SELECT id FROM lives WHERE date = $1 AND venue = $2 LIMIT 1`;
            const checkRes = await client.query(checkQuery, [live.date, live.venue]);

            let dbId;
            if (checkRes.rows.length > 0) {
                dbId = checkRes.rows[0].id;
                const updateQuery = `UPDATE lives SET type=$1, prefecture=$2, tour_name=$3, title=$4 WHERE id=$5`;
                await client.query(updateQuery, [live.type, live.prefecture, live.tourTitle, live.tourTitle, dbId]);
            } else {
                const insertQuery = `
                    INSERT INTO lives (date, venue, type, prefecture, tour_name, title)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING id
                `;
                const insertRes = await client.query(insertQuery, [live.date, live.venue, live.type, live.prefecture, live.tourTitle, live.tourTitle]);
                dbId = insertRes.rows[0].id;
            }
            idMap.set(live.id, dbId);
        }

        // 2. Insert Songs & Setlists
        for (const [jsLiveId, songs] of Object.entries(setlists)) {
            const dbLiveId = idMap.get(jsLiveId);
            if (!dbLiveId) {
                console.warn(`Skipping setlist for unknown live ID: ${jsLiveId}`);
                continue;
            }
            console.log(`Processing setlist for DB Live ID: ${dbLiveId} (JS ID: ${jsLiveId})`);

            await client.query('DELETE FROM setlists WHERE live_id = $1', [dbLiveId]);

            for (const song of songs) {
                // Ensure song exists
                const songQuery = `
                    INSERT INTO songs (title)
                    VALUES ($1)
                    ON CONFLICT (title) DO NOTHING
                `;
                await client.query(songQuery, [song.title]);

                const getSongIdQuery = 'SELECT id FROM songs WHERE title = $1';
                const songRes = await client.query(getSongIdQuery, [song.title]);
                const songId = songRes.rows[0].id;

                const setlistQuery = `
                    INSERT INTO setlists (live_id, song_id, position, note)
                    VALUES ($1, $2, $3, $4)
                `;
                await client.query(setlistQuery, [dbLiveId, songId, song.order, song.note || null]);
            }
        }

        await client.query('COMMIT');
        console.log("Migration completed successfully!");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Migration failed:", e);
    } finally {
        client.release();
        process.exit();
    }
}

seed();
