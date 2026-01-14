const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const albumMapping = {
    // ENIGMASIS (2023)
    "ENIGMASIS": "ENIGMASIS",
    "VICTOSPIN": "ENIGMASIS",
    "ビタースウィート": "ENIGMASIS",
    "Theory": "ENIGMASIS",
    "ANOMALY": "ENIGMASIS",
    "EN": "ENIGMASIS",
    "One stroke for freedom": "ENIGMASIS",
    "Don't Think. Sing": "ENIGMASIS",
    "alpha": "ENIGMASIS",
    "Two lies": "ENIGMASIS",
    "THE WINGS": "ENIGMASIS",
    "CHANCE!": "ENIGMASIS", // Re-recorded/Album ver
    "Q.E.D.": "Neo SOUND BEST", // Or Timeless (Indies) -> Best

    // 30 (2021)
    "AVALANCHE": "30",
    "Making it Drive": "30",
    "One Last Time": "30",
    "SOUL": "30",
    "NAMELY": "30",
    "THUG LIFE": "30",
    "NEVER ENDING WORLD": "30",
    "AS ONE": "30",

    // UNSER (2019)
    "Touch off": "UNSER",
    "AFTER LIFE": "UNSER",
    "stay on": "UNSER",
    "無意味になる夜": "UNSER",
    "First Sight": "UNSER",
    "ODD FUTURE": "UNSER",
    "GOOD and EVIL": "UNSER",
    "EDENへ": "UNSER",
    "ConneQt": "UNSER",
    "One Last Time": "UNSER", // Duplicate check needed? No, title ref.

    // TYCOON (2017)
    "TYCOON": "TYCOON",
    "Q.E.D.": "TYCOON",
    "シリウス": "TYCOON",
    "SHOUT LOVE": "TYCOON",
    "IDEAL REALITY": "TYCOON",
    "LONE WOLF": "TYCOON",
    "DECIDED": "TYCOON",
    "PRAYING RUN": "TYCOON",
    "ALL ALONE": "TYCOON",
    "一滴の影響": "TYCOON",
    "Honest": "TYCOON",
    "Dis is TEKI": "TYCOON",
    "僕の言葉ではない これは僕達の言葉": "TYCOON",
    "WE ARE GO": "TYCOON",
    "Collide": "TYCOON",
    "奏全域": "TYCOON",
    "I LOVE THE WORLD": "TYCOON",
    "EMILY": "TYCOON",
    "RANGE": "TYCOON",

    // THE ONE (2012)
    "THE ONE": "THE ONE",
    "7th Trigger": "THE ONE",
    "Don't Think.Feel": "THE ONE",
    "LIMITLESS": "THE ONE",
    "23ワード": "THE ONE",
    "KINJITO": "THE ONE", // Single but in album
    "BABY BORN & GO": "THE ONE",
    "REVERSI": "THE ONE",
    "バーベル~皇帝の新しい服ver.~": "THE ONE",
    "AWAYOKUBA-斬る": "THE ONE",
    "NOWHERE boy": "THE ONE",
    "CORE PRIDE": "THE ONE",
    "MONDO PIECE": "THE ONE",

    // LIFE 6 SENSE (2011)
    "CORE PRIDE": "LIFE 6 SENSE", // Actually in Life 6 Sense first? Yes.
    "MONDO PIECE": "LIFE 6 SENSE",
    "NO.1": "LIFE 6 SENSE",
    "No.1": "LIFE 6 SENSE",
    "クオリア": "LIFE 6 SENSE",
    "Gold": "LIFE 6 SENSE",
    "白昼夢": "LIFE 6 SENSE",
    "Ace of Ace": "LIFE 6 SENSE",

    // LAST (2010)
    "GOLD": "LAST",
    "world LOST world": "LAST",
    "スパルタ": "LAST",
    "ハイ!問題作": "LAST",
    "Closed POKER": "LAST",
    "哀しみはきっと": "LAST",
    "CHANGE": "LAST",
    "GO-ON": "LAST",

    // AwakEVE (2009)
    "激動": "AwakEVE",
    "Just Break the Limit!": "AwakEVE",
    "儚くも永久のカナシ": "AwakEVE",
    "Roots": "AwakEVE",

    // PROGLUTION (2008)
    "Roots": "PROGLUTION",
    "浮世CROSSING": "PROGLUTION",
    "シャカビーチ〜Laka Laka La〜": "PROGLUTION",

    // BUGRIGHT (2007)
    "Colors of the Heart": "BUGRIGHT",
    "SHAMROCK": "BUGRIGHT",
    "君の好きなうた": "BUGRIGHT",

    // Timeless (2006)
    "CHANCE!": "Timeless",
    "D-tecnoLife": "Timeless",
    "just Melody": "Timeless",

    // OTHERS / SINGLES
    "FINAL ISTV": "Video",
    "FIGHT FOR LIBERTY": "Single",
    "ナノ・セカンド": "Single", // 2013
    "IMPACT": "Ø CHOIR", // 2014
    "0 choir": "Ø CHOIR",
    "Wizard CLUB": "Ø CHOIR",
    "7日目の決意": "Ø CHOIR",
    "在るべき形": "Ø CHOIR",
    "誰が言った": "Ø CHOIR",
    "Massive": "Ø CHOIR",
    "Enough-1": "Ø CHOIR",
    "KICK が自由": "Ø CHOIR",

    // Recent / Uncategorized in seed list
    "Eye's Sentry": "Single",
    "Love": "Single"
};

// Override/Refine some ambiguous ones
albumMapping["CORE PRIDE"] = "THE ONE";
albumMapping["MONDO PIECE"] = "THE ONE";
albumMapping["7th Trigger"] = "THE ONE";
albumMapping["Touch off"] = "UNSER";
albumMapping["PRAYING RUN"] = "TYCOON";
albumMapping["IMPACT"] = "Ø CHOIR";
albumMapping["ナノ・セカンド"] = "Ø CHOIR";
albumMapping["No.1"] = "LIFE 6 SENSE";
albumMapping["Gold"] = "LIFE 6 SENSE";

const seedAlbums = async () => {
    console.log("Seeding Album Data...");
    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            for (const [title, album] of Object.entries(albumMapping)) {
                // Update songs that match title
                const res = await client.query(
                    "UPDATE songs SET album = $1 WHERE title = $2",
                    [album, title]
                );
                if (res.rowCount > 0) {
                    console.log(`Updated ${title} -> ${album}`);
                }
            }

            await client.query('COMMIT');
            console.log("Album seeding completed.");
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (e) {
        console.error("Error seeding albums:", e);
    } finally {
        await pool.end();
    }
};

seedAlbums();
