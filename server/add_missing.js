const db = require('./db');

// Missing songs to add with their correct album
const missingSongs = [
    { title: "-forecast map 1955-", album: "PROGLUTION" },
    { title: "-god's followers-", album: "PROGLUTION" },
    { title: "-妙策号外ORCHESTRA-", album: "PROGLUTION" },
    { title: "= (Equal)", album: "Single" },
    { title: "CHANCE!04", album: "Single" },
    { title: "DIS is TEKI", album: "Single" },
    { title: "Extreme", album: "Single" },
    { title: "Mixed-Up", album: "Single" },
    { title: "Prime", album: "Single" },
    { title: "Secret", album: "LIFE 6 SENSE" },
    { title: "UVER Battle Royal", album: "Single" },
    { title: "Uberworld", album: "Single" },
    { title: "core ability +81", album: "Single" },
    { title: "expod -digital", album: "PROGLUTION" },
    { title: "to the world（SE）", album: "PROGLUTION" },
    { title: "アイ・アム Riri", album: "AwakEVE" },
    { title: "ハイ!問題作", album: "LAST" },
    { title: "バーベル", album: "THE ONE" },
    { title: "モノクローム～気付けなかったdevotion～", album: "Single" },
    { title: "一石を投じる", album: "LIFE 6 SENSE" },
    { title: "僕に重なって来る今", album: "Single" },
    { title: "志 -kokorozashi-", album: "Single" },
    { title: "恋しくて", album: "AwakEVE" },
    { title: "超大作+81", album: "Single" },
    { title: "零HERE～SE～", album: "Ø CHOIR" },
    { title: "～流れ・空虚・THIS WORD～", album: "BUGRIGHT" }
];

(async () => {
    try {
        let added = 0;
        for (const song of missingSongs) {
            // Check if exists
            const check = await db.query("SELECT id FROM songs WHERE title = $1", [song.title]);
            if (check.rows.length === 0) {
                await db.query(
                    "INSERT INTO songs (title, album) VALUES ($1, $2)",
                    [song.title, song.album]
                );
                console.log(`Added: ${song.title} (${song.album})`);
                added++;
            } else {
                console.log(`Already exists: ${song.title}`);
            }
        }
        console.log(`\nTotal added: ${added}`);
        process.exit(0);
    } catch (e) { console.error(e); process.exit(1); }
})();
