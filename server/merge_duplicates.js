const db = require('./db');

// ローマ字→日本語のマッピング（同じ曲）
const romajiToJapanese = {
    '6-tsu no Kaze': '6つの風',
    'Chimimouryou March': '魑魅魍魎マーチ',
    'Isseki wo Toujiru Tokyo midnight sun': '一石を投じる　Tokyo midnight sun',
    'Itsuka Kanarazu Shinu Koto wo Wasureru Na': 'いつか必ず死ぬことを忘れるな',
    '7 Nichi Me no Ketsui': '7日目の決意',
    'Madara Chou': 'マダラ蝶',
    'Wakasa Yue Enterekeia': '若さ故エンテレケイア',
    "Hon'no Sukoshi": 'ほんの少し',
    'Boku no Kotoba de wanai Kore wa Bokutachi no Kotoba': '僕の言葉ではない これは僕達の言葉',
    "Sou Zen'iki": '奏全域',
    'ANOMALY sousha': 'ANOMALY奏者',
    'Zero HERE ~SE~': '零 HERE ～SE～',
    'Barbell ~ Koutei no Atarashii Fuku': 'バーベル～皇帝の新しい服 album ver.～',
    'Shousha Okubyoumono': '勝者臆病者',
    'Raichoue': '来鳥江',
    'Kokorozashi': '志-kokorozashi-',
    'counting song-H': 'counting song - H',
    'Monochrome ~Kidukenakatta devotion~': 'モノクローム〜気付けなかったdevotion〜',
    'Kami Atsume': '神集め',
    'Kokoro ga Sasu Basho to Kuchiguse Soshite Kimi ga Tsuite Kuru': '心が指す場所と口癖　そして君がついて来る',
    '~Nagare · Kuukyo · THIS WORD~': '〜流れ・空虚・THIS WORD〜',
    'Home Binetsu 39℃': 'Home 微熱39℃',
    'Shaka Beach: Laka Laka La': 'シャカビーチ〜Laka Laka La〜',
    "Don't Think. Sing": "Don't Think.Sing",
    'Theory': 'THEORY',
};

(async () => {
    try {
        console.log('=== Merging Romaji Duplicates ===\n');
        let totalMerged = 0;
        let totalDeleted = 0;

        for (const [romaji, japanese] of Object.entries(romajiToJapanese)) {
            // Find both songs
            const romajiSong = await db.query("SELECT id FROM songs WHERE title = $1", [romaji]);
            const japaneseSong = await db.query("SELECT id FROM songs WHERE title = $1", [japanese]);

            if (romajiSong.rows.length > 0 && japaneseSong.rows.length > 0) {
                const romajiId = romajiSong.rows[0].id;
                const japaneseId = japaneseSong.rows[0].id;

                // Update setlists to point to Japanese version
                const setlistUpdate = await db.query(
                    "UPDATE setlists SET song_id = $1 WHERE song_id = $2",
                    [japaneseId, romajiId]
                );

                // Delete romaji song
                await db.query("DELETE FROM songs WHERE id = $1", [romajiId]);

                console.log(`Merged: ${romaji} (#${romajiId}) -> ${japanese} (#${japaneseId}) [${setlistUpdate.rowCount} setlists]`);
                totalMerged++;
            } else if (romajiSong.rows.length > 0 && japaneseSong.rows.length === 0) {
                // No Japanese version exists, rename romaji to Japanese
                await db.query("UPDATE songs SET title = $1 WHERE title = $2", [japanese, romaji]);
                console.log(`Renamed: ${romaji} -> ${japanese}`);
                totalMerged++;
            }
        }

        console.log(`\n=== Done! Merged/Renamed: ${totalMerged} songs ===`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
