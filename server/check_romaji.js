const db = require('./db');

// List of known English titles (simplified) to ignore
const knownEnglish = [
    'D-tecnoLife', 'CHANCE!', 'just Melody', 'SHAMROCK', 'Colors of the Heart', 'endscape', 'GO-ON', 'GOLD', 'Qualia', 'CORE PRIDE',
    'KINJITO', 'BABY BORN & GO', '7th Trigger', 'THE OVER', 'REVERSI', 'Fight For Liberty', 'Wizard CLUB', 'Nano-Second', 'I LOVE THE WORLD',
    'WE ARE GO', 'ALL ALONE', 'DECIDED', 'ODD FUTURE', 'GOOD and EVIL', 'Touch off', 'ROB THE FRONTIER', 'AS ONE', 'HOURGLASS', 'NAMELY',
    'AVALANCHE', 'MAKING IT DRIVE', 'EN', 'One stroke for freedom', 'VICTOSPIN', 'MEMORIES of the End', 'Eye\'s Sentry', 'PHOENIX AX',
    'MMH', 'THEORY', 'Dis is TEKI', 'O choir', 'Q.E.D.', 'Spread own risk', 'ace of ace', 'energy', 'Burst', 'brand new ancient', 'Roots', 'Nitro',
    '99/100騙しの哲', '99/100' // mixed
];

async function findCandidates() {
    try {
        // Find titles with only ASCII chars (approx for Romaji)
        const res = await db.query("SELECT * FROM songs WHERE title ~ '^[A-Za-z0-9 \\!\\?\\-\\.\\&]+$' ORDER BY title");

        const candidates = res.rows.filter(s => {
            // Filter out known English titles (case-insensitive check)
            const upper = s.title.toUpperCase();
            const isKnown = knownEnglish.some(k => k.toUpperCase() === upper) || knownEnglish.some(k => upper.includes(k.toUpperCase()));
            return !isKnown;
        });

        console.log("--- Potential Romaji Candidates ---");
        candidates.forEach(c => console.log(`${c.id}: ${c.title}`));

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

findCandidates();
