const db = require('./db');

const japaneseTitles = [
    "志 -kokorozashi-", "志", // For Kokorozashi
    "マダラ蝶", // Madara Chou
    "勝者臆病者", // Shousha Okubyoumono
    "無意味になる夜", // Muimininaruyoru
    "言わなくても伝わる あれは少し嘘だ", // Iwanakute mo...
    "いつか必ず死ぬことを忘れるな", // Itsuka Kanarazu...
    "心が指す場所と口癖 そして君がついて来る", // Kokoro ga...
    "雷鳥", // Raichoue?
    "来鳥江" // Raichoue (actually correct title might be this) -> "Raichoe"
];

async function checkExistence() {
    try {
        const res = await db.query(
            "SELECT * FROM songs WHERE title = ANY($1)",
            [japaneseTitles]
        );
        console.log("--- Existing Japanese Titles ---");
        res.rows.forEach(r => console.log(`${r.id}: ${r.title}`));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkExistence();
