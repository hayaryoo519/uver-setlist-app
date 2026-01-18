const db = require('./db');

// 曲名からアルバムへのマッピング（公式ディスコグラフィに基づく）
const songToAlbum = {
    // ============================================
    // Timeless (2006)
    // ============================================
    "D-tecnoLife": "Timeless",
    "D-tecnolife": "Timeless",
    "CHANCE!": "Timeless",
    "just Melody": "Timeless",
    "ai ta心": "Timeless",
    "ai ta kokoro": "Timeless",
    "トキノナミダ": "Timeless",
    "優しさの雫": "Timeless",
    "扉": "Timeless",
    "Burst": "Timeless",
    "Nitro": "Timeless",
    "Lump Of Affection": "Timeless",
    "SE": "Timeless",
    "Colors of the Heart": "Timeless",
    "SHAMROCK": "Timeless",

    // ============================================
    // BUGRIGHT (2007)
    // ============================================
    "ゼロの答": "BUGRIGHT",
    "Home": "BUGRIGHT",
    "Home 微熱39℃": "BUGRIGHT",
    "Home Binetsu 39℃": "BUGRIGHT",
    "微熱39℃ 〜流れ・空虚・THIS WORD〜": "BUGRIGHT",
    "〜流れ・空虚・THIS WORD〜": "BUGRIGHT",
    "~Nagare · Kuukyo · THIS WORD~": "BUGRIGHT",
    "一人じゃないから": "BUGRIGHT",
    "SORA": "BUGRIGHT",
    "シャルマンノウラ": "BUGRIGHT",
    "51%": "BUGRIGHT",
    "LIFEsize": "BUGRIGHT",
    "EMPTY96": "BUGRIGHT",
    "Live everyday as if it were the last day": "BUGRIGHT",
    "DISCORD": "BUGRIGHT",
    "endscape": "BUGRIGHT",
    "シャカビーチ〜Laka Laka La〜": "BUGRIGHT",
    "Shaka Beach: Laka Laka La": "BUGRIGHT",
    "君の好きなうた": "BUGRIGHT",

    // ============================================
    // PROGLUTION (2008)
    // ============================================
    "浮世CROSSING": "PROGLUTION",
    "激動": "PROGLUTION",
    "儚くも永久のカナシ": "PROGLUTION",
    "Just break the limit!": "PROGLUTION",
    "恋いしくて": "PROGLUTION",
    "志-kokorozashi-": "PROGLUTION",
    "Kokorozashi": "PROGLUTION",
    "over the stoic": "PROGLUTION",
    "体温": "PROGLUTION",
    "ハルジオン": "PROGLUTION",
    "99/100騙しの哲": "PROGLUTION",
    "美影意志": "PROGLUTION",
    "コロナ": "PROGLUTION",
    "earthy world": "PROGLUTION",
    "畢生皐月プロローグ": "PROGLUTION",
    "アイ・アム　Riri": "PROGLUTION",
    "Forget": "PROGLUTION",
    "和音": "PROGLUTION",
    "YURA YURA": "PROGLUTION",
    "PROGLUTION": "PROGLUTION",
    "UNKNOWN ORCHESTRA": "PROGLUTION",
    "モノクローム〜気付けなかったdevotion〜": "PROGLUTION",
    "Monochrome ~Kidukenakatta devotion~": "PROGLUTION",
    "Rainy": "PROGLUTION",
    "sorrow": "PROGLUTION",
    "energy": "PROGLUTION",
    "Roots": "PROGLUTION",
    "病的希求日記": "PROGLUTION",
    "counting song - H": "PROGLUTION",
    "counting song-H": "PROGLUTION",
    "神集め": "PROGLUTION",
    "Kami Atsume": "PROGLUTION",
    "心が指す場所と口癖　そして君がついて来る": "PROGLUTION",
    "Kokoro ga Sasu Basho to Kuchiguse Soshite Kimi ga Tsuite Kuru": "PROGLUTION",
    "オトノハ": "PROGLUTION",

    // ============================================
    // AwakEVE (2009)
    // ============================================
    "GO-ON": "AwakEVE",
    "哀しみはきっと": "AwakEVE",
    "the truth": "AwakEVE",
    "マダラ蝶": "AwakEVE",
    "Madara Chou": "AwakEVE",
    "撃破": "AwakEVE",
    "CHANGE": "AwakEVE",
    "MINORI": "AwakEVE",
    "world LOST world": "AwakEVE",
    "スパルタ": "AwakEVE",
    "心とココロ": "AwakEVE",
    "バーレル": "AwakEVE",
    "ﾊｲ!問題作": "AwakEVE",
    "closed POKER": "AwakEVE",
    "WANNA be BRILLIANT": "AwakEVE",
    "君のまま": "AwakEVE",
    "若さ故エンテレケイア": "AwakEVE",
    "Wakasa Yue Enterekeia": "AwakEVE",

    // ============================================
    // LAST (2010)
    // ============================================
    "GOLD": "LAST",
    "クオリア": "LAST",
    "Ultimate": "LAST",
    "NO.1": "LAST",
    "6つの風": "LAST",
    "6-tsu no Kaze": "LAST",
    "超大作＋81": "LAST",
    "MONDO PIECE": "LAST",
    "パニックワールド": "LAST",
    "魑魅魍魎マーチ": "LAST",
    "Chimimouryou March": "LAST",
    "境地・マントラ": "LAST",
    "いつか必ず死ぬことを忘れるな": "LAST",
    "Itsuka Kanarazu Shinu Koto wo Wasureru Na": "LAST",
    "一石を投じる　Tokyo midnight sun": "LAST",
    "Isseki wo Toujiru Tokyo midnight sun": "LAST",

    // ============================================
    // LIFE 6 SENSE (2011)
    // ============================================
    "CORE PRIDE": "LIFE 6 SENSE",
    "BABY BORN & GO": "LIFE 6 SENSE",
    "ace of ace": "LIFE 6 SENSE",
    "シークレット": "LIFE 6 SENSE",
    "勝者臆病者": "LIFE 6 SENSE",
    "Shousha Okubyoumono": "LIFE 6 SENSE",
    "一億分の一の小説": "LIFE 6 SENSE",
    "白昼夢": "LIFE 6 SENSE",

    // ============================================
    // THE ONE (2012)
    // ============================================
    "7th Trigger": "THE ONE",
    "THE OVER": "THE ONE",
    "AWAYOKUBA-斬る": "THE ONE",
    "THE SONG": "THE ONE",
    "Massive": "THE ONE",
    "セオリーとの決別の研究+81": "THE ONE",
    "Don't Think.Feel": "THE ONE",
    "LIMITLESS": "THE ONE",
    "23ワード": "THE ONE",
    "此処から": "THE ONE",
    "boy": "THE ONE",
    "a LOVELY TONE": "THE ONE",
    "バーベル～皇帝の新しい服 album ver.～": "THE ONE",
    "Barbell ~ Koutei no Atarashii Fuku": "THE ONE",
    "THE ONE (SE)": "THE ONE",
    "THE ONE": "THE ONE",

    // ============================================
    // Ø CHOIR (2014)
    // ============================================
    "REVERSI": "Ø CHOIR",
    "Fight For Liberty": "Ø CHOIR",
    "Wizard CLUB": "Ø CHOIR",
    "ナノ・セカンド": "Ø CHOIR",
    "誰が言った": "Ø CHOIR",
    "ENOUGH-1": "Ø CHOIR",
    "KICKが自由": "Ø CHOIR",
    "別世界": "Ø CHOIR",
    "Born Slippy": "Ø CHOIR",
    "Born Slippy .NUXX": "Ø CHOIR",
    "在るべき形": "Ø CHOIR",
    "0 choir": "Ø CHOIR",
    "Ø CHOIR": "Ø CHOIR",
    "零 HERE ～SE～": "Ø CHOIR",
    "Zero HERE ~SE~": "Ø CHOIR",
    "ANOMALY奏者": "Ø CHOIR",
    "ANOMALY sousha": "Ø CHOIR",

    // ============================================
    // TYCOON (2017)
    // ============================================
    "僕の言葉ではない これは僕達の言葉": "TYCOON",
    "Boku no Kotoba de wanai Kore wa Bokutachi no Kotoba": "TYCOON",
    "I LOVE THE WORLD": "TYCOON",
    "WE ARE GO": "TYCOON",
    "ALL ALONE": "TYCOON",
    "一滴の影響": "TYCOON",
    "DECIDED": "TYCOON",
    "PRAYING RUN": "TYCOON",
    "エミュー": "TYCOON",
    "Forever Young": "TYCOON",
    "RANGE": "TYCOON",
    "Q.E.D.": "TYCOON",
    "シリウス": "TYCOON",
    "SHOUT LOVE": "TYCOON",
    "IDEAL REALITY": "TYCOON",
    "LONE WOLF": "TYCOON",
    "奏全域": "TYCOON",
    "Sou Zen'iki": "TYCOON",
    "終焉": "TYCOON",
    "Collide": "TYCOON",
    "TYCOON": "TYCOON",
    "ほんの少し": "TYCOON",
    "Hon'no Sukoshi": "TYCOON",

    // ============================================
    // UNSER (2019)
    // ============================================
    "ODD FUTURE": "UNSER",
    "GOOD and EVIL": "UNSER",
    "EDENへ": "UNSER",
    "Touch off": "UNSER",
    "ROB THE FRONTIER": "UNSER",
    "PLOT": "UNSER",
    "CORE STREAM": "UNSER",
    "ConneQt": "UNSER",
    "Making it Drive": "UNSER",
    "AFTER LIFE": "UNSER",
    "境界": "UNSER",
    "stay on": "UNSER",
    "First Sight": "UNSER",
    "無意味になる夜": "UNSER",
    "OXYMORON": "UNSER",
    "One Last Time": "UNSER",
    "UNSER": "UNSER",

    // ============================================
    // 30 (2021)
    // ============================================
    "AS ONE": "30",
    "NAMELY": "30",
    "Spreadown": "30",
    "HOURGLASS": "30",
    "Teenage Love": "30",
    "LIVIN' IT UP": "30",
    "来鳥江": "30",
    "Raichoue": "30",
    "SOUL": "30",
    "AVALANCHE": "30",
    "イーティー": "30",
    "One stroke for freedom": "30",
    "えくぼ": "30",
    "OUR ALWAYS": "30",
    "THUG LIFE": "30",
    "NEVER ENDING WORLD": "30",
    "ピグマリオン": "30",
    "BVCK": "30",
    "ビタースウィート": "30",
    "EN": "30",

    // ============================================
    // ENIGMASIS (2023-2024)
    // ============================================
    "VICTOSPIN": "ENIGMASIS",
    "Victosound": "ENIGMASIS",
    "ENCORE AGAIN": "ENIGMASIS",
    "FINALIST": "ENIGMASIS",
    "echoOZ": "ENIGMASIS",
    "Don't Think.Sing": "ENIGMASIS",
    "THEORY": "ENIGMASIS",
    "α-Skill": "ENIGMASIS",
    "two Lies": "ENIGMASIS",
    "ENIGMASIS": "ENIGMASIS",
    "High Light!": "ENIGMASIS",
    "WINGS ever": "ENIGMASIS",
    "Eye's Sentry": "ENIGMASIS",
    "EYES OF THE FUTURE": "ENIGMASIS",
    "MEMORIES of the End": "ENIGMASIS",
    "PHOENIX": "ENIGMASIS",
    "MMH": "ENIGMASIS",
    "KINJITO (LIVE intro ver.)": "ENIGMASIS",
    "NOWHERE boy": "ENIGMASIS",
    "人生賛歌": "ENIGMASIS",

    // ============================================
    // Singles (独立したシングル)
    // ============================================
    "KINJITO": "Single",
    "NEW WORLD": "Single",

    // ============================================
    // その他・ライブ限定・カバー等
    // ============================================
    "LIFE": "LAST",
    "DEJAVU": "LAST",
    "7日目の決意": "LAST",
    "7 Nichi Me no Ketsui": "LAST",
    "AWAKE": "AwakEVE",
    "Rush": "LIFE 6 SENSE",
    "UNISON": "LIFE 6 SENSE",
    "TA-LI": "TYCOON",
    "IMPACT": "LIFE 6 SENSE",
    "GiANT KiLLERS": "Single",
    "GROOVY GROOVY GROOVY": "Single",
    "=": "Single",
    "Pretender": "Video",
    "Shukumei": "Video",
    "EPIPHANY": "ENIGMASIS",
    "EVER": "ENIGMASIS",
    "If...Hello": "ENIGMASIS",
    "to the world": "ENIGMASIS",
    "JUMP": "ENIGMASIS",
    "Honpen": "ENIGMASIS",
    "ROSIER": "Video",
    "Bye-Bye to you": "Single",
    "NO MAP": "Single",
    "WICKED boy": "ENIGMASIS",
    "ZERO BREAKOUT POINT": "ENIGMASIS",
    "PHOENIX AX": "ENIGMASIS",
    "Only US": "ENIGMASIS",
    "Kirifuda": "Single",
    "Countdown": "Video",
    "ONIGIRI": "Video",
    "PRIME": "Single",
    "uber cozy universe": "ENIGMASIS",
    "über cozy universe": "ENIGMASIS",
    "EYEWALL": "ENIGMASIS",
    "DON!DON!TAKESHI": "Video",
    "brand new ancient": "ENIGMASIS",
    "Last Christmas": "Video",
    "Between Us": "Single",
    "Gangnam Style": "Video",
    "Ditto": "Video",
    "Mainstream": "Single",
    "SHINE": "Single",
    "Iwanakute mo Tsutawaru Are wa Sukoshi Uso da": "ENIGMASIS",
};

(async () => {
    try {
        console.log('=== Updating album data for songs ===\n');

        let updated = 0;

        for (const [title, album] of Object.entries(songToAlbum)) {
            const result = await db.query(
                "UPDATE songs SET album = $1 WHERE title = $2 AND (album IS NULL OR album = '')",
                [album, title]
            );
            if (result.rowCount > 0) {
                console.log(`Updated: ${title} -> ${album}`);
                updated += result.rowCount;
            }
        }

        console.log(`\n=== Done! Updated ${updated} songs ===`);

        // 残りの未設定を確認
        const remaining = await db.query(
            "SELECT id, title FROM songs WHERE album IS NULL OR album = '' ORDER BY title"
        );
        if (remaining.rows.length > 0) {
            console.log(`\n=== Still missing album (${remaining.rows.length}) ===`);
            remaining.rows.forEach(r => console.log(r.id, ':', r.title));
        } else {
            console.log('\nAll songs now have album data!');
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
