const fs = require('fs');
const allLives = JSON.parse(fs.readFileSync('lives.json', 'utf8'));
const allSongs = JSON.parse(fs.readFileSync('songs.json', 'utf8'));

// Mimic useGlobalStats logic
const songIdMap = new Map();
allSongs.forEach(s => songIdMap.set(s.title, s.id));

const tourData = {};
allLives.forEach(live => {
    const title = live.tour_name || live.title || "Unknown Tour";
    if (!tourData[title]) {
        tourData[title] = {
            count: 0,
            songCounts: {},
        };
    }
    tourData[title].count += 1;

    const setlist = live.setlist || [];
    setlist.forEach(song => {
        if (!song || !song.title) return; // Add check for safety

        if (!tourData[title].songCounts[song.title]) {
            tourData[title].songCounts[song.title] = { count: 0, lives: [] };
        }
        tourData[title].songCounts[song.title].count += 1;

        // Match logic from hook
        if (song.id && !tourData[title].songCounts[song.title].id) {
            tourData[title].songCounts[song.title].id = song.id;
        }
    });
});

// Check specific tour mentioned by user (LATEST TOUR typically)
// Or just check ENIGMASIS explicitly
console.log("Checking ENIGMASIS in all tour data...");

let found = false;
Object.entries(tourData).forEach(([tourName, data]) => {
    if (data.songCounts['ENIGMASIS']) {
        const info = data.songCounts['ENIGMASIS'];
        const resolvedId = info.id || songIdMap.get('ENIGMASIS');
        console.log(`Tour: ${tourName}, Song: ENIGMASIS, ID in info: ${info.id}, Resolved ID: ${resolvedId}`);
        found = true;
    }
});

if (!found) console.log("ENIGMASIS not found in any tour setlist.");
