/**
 * ローカル開発用テストデータシードスクリプト
 *
 * 使い方:
 *   cd server
 *   node scripts/seed_local.js
 *
 * 投入データ:
 *   - ユーザー   : 管理者1名 + 一般ユーザー2名
 *   - 曲         : UVERworldの代表曲 30曲
 *   - ライブ     : 過去3件（セトリあり）+ 近日2件（予想受付中）
 *   - セトリ     : 過去ライブ3件分
 *   - 予想       : テストユーザーによる予想データ
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
});

// ----------------------------
// テストデータ定義
// ----------------------------

const bcrypt = require('bcrypt');

/** テストユーザー (パスワードは全員 "password123" のbcryptハッシュ) */
const SEED_PASSWORD = 'password123';

async function getUsersWithHashedPasswords() {
    const hashedPassword = await bcrypt.hash(SEED_PASSWORD, 10);
    return [
        {
            username: 'admin_test',
            email: 'admin@test.local',
            password: hashedPassword,
            role: 'admin',
            is_verified: true,
            is_public: true,
        },
        {
            username: 'uver_fan1',
            email: 'fan1@test.local',
            password: hashedPassword,
            role: 'user',
            is_verified: true,
            is_public: true,
        },
        {
            username: 'uver_fan2',
            email: 'fan2@test.local',
            password: hashedPassword,
            role: 'user',
            is_verified: true,
            is_public: false,
        },
    ];
}

/** UVERworldの代表曲 */
const SONGS = [
    { title: 'SHAMROCK', album: 'SHAMROCK', release_year: 2006 },
    { title: 'D-tecnoLife', album: 'D-tecnoLife', release_year: 2005 },
    { title: '儚くも永久のカナシ', album: '儚くも永久のカナシ', release_year: 2008 },
    { title: 'MONDO PIECE', album: 'MONDO PIECE', release_year: 2009 },
    { title: 'GOLD', album: 'GOLD', release_year: 2009 },
    { title: ' Life 6 Sense', album: 'Life 6 Sense', release_year: 2012 },
    { title: 'nO limiT', album: 'TYCOON', release_year: 2017 },
    { title: 'ODD FUTURE', album: 'TYCOON', release_year: 2017 },
    { title: 'Q.E.D.', album: '7th trigger', release_year: 2019 },
    { title: 'PRAYING RUN', album: '7th trigger', release_year: 2019 },
    { title: 'IMPACT', album: 'IMPACT', release_year: 2007 },
    { title: 'endscape', album: 'endscape', release_year: 2007 },
    { title: 'Colors of the Heart', album: 'Colors of the Heart', release_year: 2008 },
    { title: 'OVER', album: 'OVER', release_year: 2011 },
    { title: 'WIZARD', album: 'WIZARD', release_year: 2011 },
    { title: 'AwakEVE', album: 'AwakEVE', release_year: 2010 },
    { title: 'PRAYING RUN', album: 'Ø(zero)', release_year: 2014 },
    { title: 'BEAST', album: 'BEAST', release_year: 2013 },
    { title: 'Come on', album: 'Come on', release_year: 2014 },
    { title: 'お前の夢を見た', album: 'THE ONE', release_year: 2015 },
    { title: '在るべき形', album: 'THE ONE', release_year: 2015 },
    { title: 'PRAYING RUN 2', album: '2 of Us', release_year: 2022 },
    { title: '強く、はかなく', album: 'THE ONE', release_year: 2015 },
    { title: 'WORLD ROCK', album: 'WORLD ROCK', release_year: 2016 },
    { title: 'Fight For Life', album: 'Fight For Life', release_year: 2020 },
    { title: '俺たちのSTARTING OVER', album: 'UNSER', release_year: 2018 },
    { title: 'EN', album: 'UNSER', release_year: 2018 },
    { title: '在るべき形 -reborn-', album: 'UNSER', release_year: 2018 },
    { title: 'IMPACT!!', album: 'IMPACT', release_year: 2007 },
    { title: 'PRAYING RUN (Acoustic)', album: 'ACOUSTIC', release_year: 2023 },
];

/** ライブデータ */
function getLives() {
    const today = new Date();
    const fmt = (d) => d.toISOString().split('T')[0];

    // 過去ライブ（セトリ確定済み）
    const past1 = new Date(today); past1.setDate(today.getDate() - 60);
    const past2 = new Date(today); past2.setDate(today.getDate() - 30);
    const past3 = new Date(today); past3.setDate(today.getDate() - 10);
    // 近日ライブ（予想受付中）
    const future1 = new Date(today); future1.setDate(today.getDate() + 14);
    const future2 = new Date(today); future2.setDate(today.getDate() + 30);

    return [
        {
            date: fmt(past1),
            venue: '国立競技場',
            title: '20th Anniversary Live 東京公演①',
            tour_name: 'UVERworld 20th Anniversary Special',
            type: 'oneman',
            prefecture: '東京都',
            setlist_status: 'NORMAL',
        },
        {
            date: fmt(past2),
            venue: 'OSAKA-JO HALL',
            title: '20th Anniversary Live 大阪公演',
            tour_name: 'UVERworld 20th Anniversary Special',
            type: 'oneman',
            prefecture: '大阪府',
            setlist_status: 'NORMAL',
        },
        {
            date: fmt(past3),
            venue: '日本武道館',
            title: 'MAN ARENA 2025 東京公演',
            tour_name: 'MAN ARENA 2025',
            type: 'oneman',
            prefecture: '東京都',
            setlist_status: 'NORMAL',
        },
        {
            date: fmt(future1),
            venue: '神奈川・横浜アリーナ',
            title: 'MAN ARENA 2025 横浜公演',
            tour_name: 'MAN ARENA 2025',
            type: 'oneman',
            prefecture: '神奈川県',
            setlist_status: null,
        },
        {
            date: fmt(future2),
            venue: '愛知・日本ガイシホール',
            title: 'MAN ARENA 2025 名古屋公演',
            tour_name: 'MAN ARENA 2025',
            type: 'oneman',
            prefecture: '愛知県',
            setlist_status: null,
        },
    ];
}

// ----------------------------
// シード実行
// ----------------------------
async function seed() {
    const client = await pool.connect();
    try {
        console.log('=== ローカルテストデータ シード開始 ===\n');

        await client.query('BEGIN');

        // 1. ユーザー投入
        console.log('[1/5] ユーザーを投入中...');
        const users = await getUsersWithHashedPasswords();
        const userIds = [];
        for (const u of users) {
            const res = await client.query(
                `INSERT INTO users (username, email, password, role, is_verified, is_public)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, username = EXCLUDED.username
                 RETURNING id`,
                [u.username, u.email, u.password, u.role, u.is_verified, u.is_public]
            );
            userIds.push(res.rows[0].id);
            console.log(`  [OK] ${u.username} (id=${res.rows[0].id})`);
        }

        // 2. 曲投入
        console.log('\n[2/5] 曲データを投入中...');
        const songIds = [];
        for (const s of SONGS) {
            const normalizedTitle = s.title.toLowerCase().replace(/\s+/g, ' ').trim();
            const res = await client.query(
                `INSERT INTO songs (title, album, release_year, normalized_title)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT DO NOTHING
                 RETURNING id`,
                [s.title, s.album, s.release_year, normalizedTitle]
            );
            if (res.rows.length > 0) {
                songIds.push(res.rows[0].id);
                console.log(`  [OK] ${s.title} (id=${res.rows[0].id})`);
            } else {
                // 既存の場合はSELECT
                const existing = await client.query(
                    'SELECT id FROM songs WHERE title = $1', [s.title]
                );
                if (existing.rows.length > 0) songIds.push(existing.rows[0].id);
            }
        }

        // 3. ライブ投入
        console.log('\n[3/5] ライブデータを投入中...');
        const lives = getLives();
        const liveIds = [];
        for (const l of lives) {
            const res = await client.query(
                `INSERT INTO lives (date, venue, title, tour_name, type, prefecture, setlist_status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING id`,
                [l.date, l.venue, l.title, l.tour_name, l.type, l.prefecture, l.setlist_status]
            );
            liveIds.push(res.rows[0].id);
            console.log(`  [OK] ${l.date} ${l.title} (id=${res.rows[0].id})`);
        }

        // 4. セトリ投入（過去3件: liveIds[0], [1], [2]）
        console.log('\n[4/5] セットリストを投入中...');
        const setlistPatterns = [
            // 過去ライブ1のセトリ（liveIds[0]）
            [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
            // 過去ライブ2のセトリ（liveIds[1]）
            [13, 14, 15, 0, 4, 7, 9, 16, 17, 18, 19, 20],
            // 過去ライブ3のセトリ（liveIds[2]）
            [21, 22, 23, 24, 25, 0, 7, 8, 2, 26, 27, 28],
        ];

        for (let li = 0; li < 3; li++) {
            const liveId = liveIds[li];
            const pattern = setlistPatterns[li];
            for (let pos = 0; pos < pattern.length; pos++) {
                const songIdx = pattern[pos];
                if (songIdx < songIds.length) {
                    await client.query(
                        'INSERT INTO setlists (live_id, song_id, position) VALUES ($1, $2, $3)',
                        [liveId, songIds[songIdx], pos + 1]
                    );
                }
            }
            console.log(`  [OK] ライブID ${liveId} のセトリ ${pattern.length}曲を投入`);
        }

        // 5. 予想データ投入（近日ライブ: liveIds[3], [4]）
        console.log('\n[5/5] 予想データを投入中...');
        const predictionData = [
            // fan1のliveIds[3]への予想
            {
                userId: userIds[1],
                liveId: liveIds[3],
                title: 'MAN ARENA 横浜セトリ予想',
                songs: [songIds[0], songIds[7], songIds[2], songIds[8], songIds[4]],
            },
            // fan2のliveIds[3]への予想
            {
                userId: userIds[2],
                liveId: liveIds[3],
                title: '横浜は激しめセトリでくるはず',
                songs: [songIds[10], songIds[1], songIds[3], songIds[6], songIds[9], songIds[11]],
            },
            // fan1のliveIds[4]への予想
            {
                userId: userIds[1],
                liveId: liveIds[4],
                title: '名古屋公演予想',
                songs: [songIds[5], songIds[13], songIds[0], songIds[7], songIds[2]],
            },
        ];

        for (const pred of predictionData) {
            const predRes = await client.query(
                `INSERT INTO predictions (user_id, live_id, title)
                 VALUES ($1, $2, $3) RETURNING id`,
                [pred.userId, pred.liveId, pred.title]
            );
            const predId = predRes.rows[0].id;

            for (let pos = 0; pos < pred.songs.length; pos++) {
                await client.query(
                    'INSERT INTO prediction_songs (prediction_id, song_id, position) VALUES ($1, $2, $3)',
                    [predId, pred.songs[pos], pos + 1]
                );
            }
            console.log(`  [OK] 予想「${pred.title}」(id=${predId}, ${pred.songs.length}曲)`);
        }

        await client.query('COMMIT');

        console.log('\n=== シード完了 ===');
        console.log(`  ユーザー : ${userIds.length}名`);
        console.log(`  曲       : ${songIds.length}曲`);
        console.log(`  ライブ   : ${liveIds.length}件 (過去3 + 近日2)`);
        console.log(`  予想     : ${predictionData.length}件`);
        console.log('\n【ログイン情報】');
        console.log('  admin_test  : admin@test.local  / password123 (管理者)');
        console.log('  uver_fan1   : fan1@test.local   / password123');
        console.log('  uver_fan2   : fan2@test.local   / password123');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('\n[ERROR] シード失敗:', err.message);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
