const db = require('./db');

// Songs from discography.js that should exist in DB
const discographySongs = new Set([
    // All unique songs from discography.js
    "D-tecnoLife", "Mixed-Up", "ai ta心", "CHANCE!", "Prime", "SHINE",
    "just Melody", "Revolve", "トキノナミダ", "Rush", "優しさの雫", "Burst", "Nitro",
    "Lump Of Affection", "扉", "Colors of the Heart", "SORA", "一人じゃないから",
    "SHAMROCK", "僕に重なって来る今", "= (Equal)", "君の好きなうた", "Extreme",
    "ゼロの答", "Home 微熱39℃", "～流れ・空虚・THIS WORD～",
    "Live everyday as if it were the last day", "シャルマンノウラ",
    "51%", "LIFEsize", "EMPTY96", "DISCORD", "endscape", "UNKNOWN ORCHESTRA",
    "モノクローム～気付けなかったdevotion～", "シャカビーチ〜Laka Laka La〜", "Rainy", "sorrow",
    "浮世CROSSING", "energy", "Roots", "brand new ancient", "病的希求日記",
    "counting song - H", "GROOVY GROOVY GROOVY", "expod -digital",
    "-妙策号外ORCHESTRA-", "-god's followers-", "神集め", "-forecast map 1955-",
    "心が指す場所と口癖　そして君がついて来る", "オトノハ", "to the world（SE）",
    "激動", "Just break the limit!", "core ability +81", "恋しくて", "志 -kokorozashi-",
    "over the stoic", "儚くも永久のカナシ", "体温", "ハルジオン",
    "99/100騙しの哲", "美影意志", "コロナ", "earthy world", "畢生皐月プロローグ",
    "アイ・アム Riri", "Forget", "和音", "YURA YURA",
    "GO-ON", "the truth", "マダラ蝶", "哀しみはきっと", "撃破",
    "GOLD", "CHANGE", "MINORI", "world LOST world", "スパルタ", "心とココロ",
    "バーレル", "ハイ!問題作", "closed POKER", "WANNA be BRILLIANT", "君のまま",
    "クオリア", "若さ故エンテレケイア", "Ultimate", "NO.1", "6つの風", "超大作+81",
    "MONDO PIECE", "パニックワールド", "魑魅魍魎マーチ", "CORE PRIDE", "境地・マントラ",
    "いつか必ず死ぬことを忘れるな", "一石を投じる", "ace of ace", "Secret", "勝者臆病者",
    "白昼夢", "BABY BORN & GO", "KINJITO", "7th Trigger", "バーベル", "AWAYOKUBA-斬る",
    "THE OVER", "THE SONG", "Massive", "THE ONE (SE)", "Don't Think.Feel", "LIMITLESS",
    "23ワード", "此処から", "REVERSI", "セオリーとの決別の研究+81",
    "Fight For Liberty", "Wizard CLUB", "a LOVELY TONE", "ナノ・セカンド", "LIFE", "DEJAVU",
    "7日目の決意", "別世界", "僕の言葉ではない これは僕達の言葉",
    "零HERE～SE～", "IMPACT", "誰が言った", "ENOUGH-1", "KICKが自由", "Born Slippy",
    "在るべき形", "0 choir", "I LOVE THE WORLD", "PRAYING RUN", "CHANCE!04",
    "WE ARE GO", "ALL ALONE", "一滴の影響", "エミュー", "Forever Young",
    "DECIDED", "RANGE", "DIS is TEKI", "TYCOON", "Q.E.D.", "シリウス", "SHOUT LOVE",
    "IDEAL REALITY", "LONE WOLF", "ほんの少し", "Collide", "奏全域", "終焉",
    "ODD FUTURE", "PLOT", "CORE STREAM", "GOOD and EVIL", "EDENへ",
    "Touch off", "ConneQt", "ROB THE FRONTIER",
    "Making it Drive", "AFTER LIFE", "境界", "stay on", "First Sight", "無意味になる夜",
    "OXYMORON", "One Last Time", "AS ONE", "Spreadown",
    "HOURGLASS", "Teenage Love", "LIVIN' IT UP", "NAMELY",
    "来鳥江", "SOUL", "AVALANCHE", "イーティー",
    "EN", "One stroke for freedom", "えくぼ", "OUR ALWAYS", "THUG LIFE", "NEVER ENDING WORLD",
    "ピグマリオン", "BVCK", "ENIGMASIS", "VICTOSPIN", "High Light!", "ENCORE AGAIN",
    "FINALIST", "echoOZ", "Don't Think.Sing", "α-Skill", "two Lies", "THEORY", "ANOMALY 奏者",
    "Eye's Sentry", "Uberworld", "MEMORIES of the End", "UVER Battle Royal",
    "PHOENIX", "Countdown", "MMH", "WINGS ever",
    "WICKED boy", "PHOENIX AX", "NO MAP", "Bye-Bye to you", "EPIPHANY", "Only US", "If...Hello", "JUMP"
]);

(async () => {
    try {
        const res = await db.query("SELECT title FROM songs");
        const dbSongs = new Set(res.rows.map(r => r.title));

        console.log("=== Songs in discography but NOT in DB (grayed out) ===");
        const missing = [];
        for (const song of discographySongs) {
            if (!dbSongs.has(song)) {
                // Check if it's a variant (Live, Inst, Album ver.)
                const isVariant = song.includes('(Live)') ||
                    song.includes('(Inst)') ||
                    song.includes('(Instrumental)') ||
                    song.includes('(Album') ||
                    song.includes('(Acoustic') ||
                    song.includes('(SE)') ||
                    song.includes('(2nd-mix)');
                if (!isVariant) {
                    missing.push(song);
                }
            }
        }

        missing.sort();
        missing.forEach(s => console.log(`- ${s}`));
        console.log(`\nTotal missing (excluding variants): ${missing.length}`);

        process.exit(0);
    } catch (e) { console.error(e); process.exit(1); }
})();
