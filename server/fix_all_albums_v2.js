const db = require('./db');

// 公式ディスコグラフィに基づく正確なアルバム割り当て
// 重複タイトルは同じ曲なので統一

const officialAlbums = {
    // ============================================
    // ENIGMASIS (2023年7月19日) - 12曲
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
    // 30 (2021年12月22日) - 13曲
    // ============================================
    '30': [
        'EN',
        'One stroke for freedom',
        'えくぼ',
        'OUR ALWAYS',
        'AVALANCHE',
        'THUG LIFE',
        'SOUL',
        '来鳥江',
        'Raichoue',
        'NAMELY',
        'イーティー',
        'AS ONE',
        'HOURGLASS',
        'NEVER ENDING WORLD',
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
    // TYCOON (2017年8月2日) - 18曲
    // ============================================
    'TYCOON': [
        'TYCOON',
        'Q.E.D.',
        'シリウス',
        'SHOUT LOVE',
        'IDEAL REALITY',
        'LONE WOLF',
        'DECIDED',
        'PRAYING RUN',
        'ALL ALONE',
        '一滴の影響',
        'ほんの少し',
        "Hon'no Sukoshi",
        '僕の言葉ではない これは僕達の言葉',
        'Boku no Kotoba de wanai Kore wa Bokutachi no Kotoba',
        'WE ARE GO',
        'Collide',
        '奏全域',
        "Sou Zen'iki",
        'I LOVE THE WORLD',
        'エミュー',
        '終焉',
    ],

    // ============================================
    // Ø CHOIR (2014年7月2日) - 12曲
    // ============================================
    'Ø CHOIR': [
        'ナノ・セカンド',
        'Ø CHOIR',
        '零 HERE ～SE～',
        'Zero HERE ~SE~',
        '誰が言った',
        'ENOUGH-1',
        'KICKが自由',
        '別世界',
        'Born Slippy',
        'Born Slippy .NUXX',
        '在るべき形',
        '0 choir',
        'REVERSI',
        'Fight For Liberty',
        'Wizard CLUB',
        'ANOMALY奏者',
        'ANOMALY sousha',
    ],

    // ============================================
    // THE ONE (2012年11月28日) - 13曲
    // ============================================
    'THE ONE': [
        'THE ONE',
        'THE ONE (SE)',
        '7th Trigger',
        'THE OVER',
        'CORE PRIDE',
        'KINJITO',
        'AWAYOKUBA-斬る',
        'THE SONG',
        'Massive',
        'セオリーとの決別の研究+81',
        "Don't Think.Feel",
        'LIMITLESS',
        '23ワード',
        '此処から',
        'boy',
        'a LOVELY TONE',
        'バーベル～皇帝の新しい服 album ver.～',
        'Barbell ~ Koutei no Atarashii Fuku',
        'MONDO PIECE',
    ],

    // ============================================
    // LIFE 6 SENSE (2011年6月1日) - 13曲
    // ============================================
    'LIFE 6 SENSE': [
        'BABY BORN & GO',
        'Gold',
        'No.1',
        'ace of ace',
        'シークレット',
        '勝者臆病者',
        'Shousha Okubyoumono',
        '一億分の一の小説',
        '白昼夢',
        'Rush',
        'UNISON',
        'IMPACT',
    ],

    // ============================================
    // LAST (2010年12月) - 13曲
    // ============================================
    'LAST': [
        'GOLD',
        'クオリア',
        'Ultimate',
        'NO.1',
        '6つの風',
        '6-tsu no Kaze',
        '超大作＋81',
        'パニックワールド',
        '魑魅魍魎マーチ',
        'Chimimouryou March',
        '境地・マントラ',
        'いつか必ず死ぬことを忘れるな',
        'Itsuka Kanarazu Shinu Koto wo Wasureru Na',
        '一石を投じる　Tokyo midnight sun',
        'Isseki wo Toujiru Tokyo midnight sun',
        'LIFE',
        'DEJAVU',
        '7日目の決意',
        '7 Nichi Me no Ketsui',
    ],

    // ============================================
    // AwakEVE (2009年) - 12曲
    // ============================================
    'AwakEVE': [
        'GO-ON',
        '哀しみはきっと',
        'the truth',
        'マダラ蝶',
        'Madara Chou',
        '撃破',
        'CHANGE',
        'MINORI',
        'world LOST world',
        'スパルタ',
        '心とココロ',
        'バーレル',
        'ﾊｲ!問題作',
        'closed POKER',
        'WANNA be BRILLIANT',
        '君のまま',
        '若さ故エンテレケイア',
        'Wakasa Yue Enterekeia',
        'AWAKE',
    ],

    // ============================================
    // PROGLUTION (2008年)
    // ============================================
    'PROGLUTION': [
        '浮世CROSSING',
        '激動',
        '儚くも永久のカナシ',
        'Just break the limit!',
        '恋いしくて',
        '志-kokorozashi-',
        'Kokorozashi',
        'over the stoic',
        '体温',
        'ハルジオン',
        '99/100騙しの哲',
        '美影意志',
        'コロナ',
        'earthy world',
        '畢生皐月プロローグ',
        'アイ・アム　Riri',
        'Forget',
        '和音',
        'YURA YURA',
        'PROGLUTION',
        'UNKNOWN ORCHESTRA',
        'モノクローム〜気付けなかったdevotion〜',
        'Monochrome ~Kidukenakatta devotion~',
        'Rainy',
        'sorrow',
        'energy',
        'Roots',
        '病的希求日記',
        'counting song - H',
        'counting song-H',
        '神集め',
        'Kami Atsume',
        '心が指す場所と口癖　そして君がついて来る',
        'Kokoro ga Sasu Basho to Kuchiguse Soshite Kimi ga Tsuite Kuru',
        'オトノハ',
    ],

    // ============================================
    // BUGRIGHT (2007年)
    // ============================================
    'BUGRIGHT': [
        'ゼロの答',
        'Home',
        'Home 微熱39℃',
        'Home Binetsu 39℃',
        '微熱39℃ 〜流れ・空虚・THIS WORD〜',
        '〜流れ・空虚・THIS WORD〜',
        '~Nagare · Kuukyo · THIS WORD~',
        '一人じゃないから',
        'SORA',
        'シャルマンノウラ',
        '51%',
        'LIFEsize',
        'EMPTY96',
        'Live everyday as if it were the last day',
        'DISCORD',
        'endscape',
        'シャカビーチ〜Laka Laka La〜',
        'Shaka Beach: Laka Laka La',
        '君の好きなうた',
    ],

    // ============================================
    // Timeless (2006年)
    // ============================================
    'Timeless': [
        'D-tecnoLife',
        'CHANCE!',
        'just Melody',
        'ai ta心',
        'トキノナミダ',
        '優しさの雫',
        '扉',
        'Burst',
        'Nitro',
        'Lump Of Affection',
        'SE',
        'Colors of the Heart',
        'SHAMROCK',
        'SHINE',
    ],

    // ============================================
    // シングル
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
        'Revolve',
        'KINJITO (LIVE intro ver.)',
        'NOWHERE boy',
        'TA-LI',
        'Forever Young',
        'RANGE',
    ],

    // ============================================
    // EPIPHANY (2025年7月リリース予定)
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

(async () => {
    try {
        console.log('=== Comprehensive Album Fix ===\n');

        let totalUpdated = 0;

        for (const [album, songs] of Object.entries(officialAlbums)) {
            let albumUpdated = 0;
            for (const title of songs) {
                const result = await db.query(
                    "UPDATE songs SET album = $1 WHERE title = $2",
                    [album, title]
                );
                albumUpdated += result.rowCount;
            }
            if (albumUpdated > 0) {
                console.log(`${album}: Updated ${albumUpdated} songs`);
                totalUpdated += albumUpdated;
            }
        }

        console.log(`\n=== Total: ${totalUpdated} updates ===`);

        // 確認
        console.log('\n=== Final Album Counts ===');
        const summary = await db.query(
            "SELECT album, COUNT(*) as cnt FROM songs GROUP BY album ORDER BY album"
        );
        summary.rows.forEach(r => console.log(`${r.album}: ${r.cnt}`));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
