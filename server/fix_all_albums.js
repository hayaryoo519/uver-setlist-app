const db = require('./db');

// 公式ディスコグラフィに基づく正確なアルバム割り当て
// 参照: uverworld.jp, tower.jp, hmv.co.jp

const albumCorrections = {
    // ============================================
    // ENIGMASIS (2023年7月19日) - 12曲のみ
    // ============================================
    'ENIGMASIS': [
        'ビタースウィート',
        'VICTOSPIN',
        'ENCORE AGAIN',
        'FINALIST',
        'echoOZ',
        "Don't Think.Sing",
        "Don't Think. Sing",
        'α-Skill',
        'two Lies',
        'THEORY',
        'Theory',
        'ピグマリオン',
        'ANOMALY奏者',
        'ANOMALY sousha',
        'ENIGMASIS',
    ],

    // ============================================
    // 30 (2021年12月22日) - 20曲
    // ============================================
    '30': [
        'AS ONE',
        'NAMELY',
        'EN',
        'Spreadown',
        'HOURGLASS',
        'Teenage Love',
        "LIVIN' IT UP",
        '来鳥江',
        'Raichoue',
        'SOUL',
        'AVALANCHE',
        'イーティー',
        'One stroke for freedom',
        'えくぼ',
        'OUR ALWAYS',
        'THUG LIFE',
        'NEVER ENDING WORLD',
        'ピグマリオン',
        'BVCK',
        'ビタースウィート', // ※ENIGMASISにも収録だがオリジナルは30
    ],

    // ============================================
    // UNSER (2019年12月4日) - 17曲
    // ============================================
    'UNSER': [
        'ODD FUTURE',
        'GOOD and EVIL',
        'EDENへ',
        'Touch off',
        'ROB THE FRONTIER',
        'PLOT',
        'CORE STREAM',
        'ConneQt',
        'Making it Drive',
        'AFTER LIFE',
        '境界',
        'stay on',
        'First Sight',
        '無意味になる夜',
        'OXYMORON',
        'One Last Time',
        'UNSER',
    ],

    // ============================================
    // シングル・その他 (アルバム未収録曲)
    // ============================================
    'Single': [
        // 2024年シングル
        "Eye's Sentry",
        'EYES OF THE FUTURE',
        'MEMORIES of the End',
        'PHOENIX',
        'MMH',
        'Victosound',
        'Countdown',
        // その他シングル
        'NEW WORLD',
        'GiANT KiLLERS',
        'GROOVY GROOVY GROOVY',
        '=',
        'Bye-Bye to you',
        'NO MAP',
        'Kirifuda',
        'PRIME',
        'Between Us',
        'SHINE',
        'Revolve',
        // ライブ限定・SE
        'KINJITO (LIVE intro ver.)',
        'THE ONE (SE)',
        '零 HERE ～SE～',
        'Zero HERE ~SE~',
        'NOWHERE boy',
    ],

    // ============================================
    // EPIPHANY (2025年7月リリース予定の新アルバム)
    // ============================================
    'EPIPHANY': [
        'EPIPHANY',
        'EVER',
        'If...Hello',
        'to the world',
        'JUMP',
        'brand new ancient',
        'EYEWALL',
        'Honpen',
        'Only US',
        'PHOENIX AX',
        'WICKED boy',
        'ZERO BREAKOUT POINT',
        'über cozy universe',
        'WINGS ever',
        'High Light!',
        '人生賛歌',
        'Iwanakute mo Tsutawaru Are wa Sukoshi Uso da',
    ],
};

// 30アルバムからピグマリオンとビタースウィートを除外（ENIGMASISに含める）
// 実際はENIGMASISにリマスター収録

(async () => {
    try {
        console.log('=== Correcting Album Assignments ===\n');

        let totalUpdated = 0;

        for (const [album, songs] of Object.entries(albumCorrections)) {
            console.log(`\n--- ${album} ---`);
            for (const title of songs) {
                const result = await db.query(
                    "UPDATE songs SET album = $1 WHERE title = $2",
                    [album, title]
                );
                if (result.rowCount > 0) {
                    console.log(`  Updated: ${title}`);
                    totalUpdated += result.rowCount;
                }
            }
        }

        // 30からピグマリオンを除外してENIGMASISに設定
        await db.query("UPDATE songs SET album = 'ENIGMASIS' WHERE title = 'ピグマリオン'");

        console.log(`\n=== Done! Total updated: ${totalUpdated} ===`);

        // 確認
        console.log('\n=== Verification ===');
        const albums = ['ENIGMASIS', '30', 'UNSER', 'Single', 'EPIPHANY'];
        for (const album of albums) {
            const count = await db.query("SELECT COUNT(*) FROM songs WHERE album = $1", [album]);
            console.log(`${album}: ${count.rows[0].count} songs`);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
