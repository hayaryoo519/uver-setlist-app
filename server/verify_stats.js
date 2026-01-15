const fs = require('fs');
const allLives = JSON.parse(fs.readFileSync('lives.json', 'utf8'));
const allSongs = JSON.parse(fs.readFileSync('songs.json', 'utf8'));

// Mimic useGlobalStats logic EXACTLY
const songIdMap = new Map();
allSongs.forEach(s => songIdMap.set(s.title, s.id));

const tourData = {};
allLives.forEach(live => {
    const title = live.tour_name || live.title || "Unknown Tour";
    if (!tourData[title]) {
        tourData[title] = {
            count: 0,
            songCounts: {},
            latestDate: live.date,
            startDate: live.date,
            endDate: live.date
        };
    }
    // ... date logic omitted ...

    const setlist = live.setlist || [];
    setlist.forEach(song => {
        if (!song || !song.title) return;

        if (!tourData[title].songCounts[song.title]) {
            tourData[title].songCounts[song.title] = { count: 0, lives: [] };
        }
        tourData[title].songCounts[song.title].count += 1;
        // ... lives push omitted ...

        // Match logic from hook
        if (song.id && !tourData[title].songCounts[song.title].id) {
            tourData[title].songCounts[song.title].id = song.id;
        }
    });
});

// Calculate tourStats
const tourStats = Object.entries(tourData)
    .map(([name, data]) => {
        const songRanking = Object.entries(data.songCounts)
            .map(([songTitle, songInfo]) => ({
                title: songTitle,
                // THE FIX I APPLIED:
                id: songInfo.id || songIdMap.get(songTitle),
                count: songInfo.count,
                // ...
            }))
            .sort((a, b) => b.count - a.count);

        return {
            name,
            songRanking,
        };
    });

// Find CORE PRIDE in "UVERworld LIVE HOUSE TOUR 2025" (or latest)
console.log("Searching for CORE PRIDE in tour stats...");
tourStats.forEach(tour => {
    const cp = tour.songRanking.find(s => s.title === 'CORE PRIDE');
    if (cp) {
        console.log(`Tour: ${tour.name}, Song: CORE PRIDE, ID: ${cp.id}, Type of ID: ${typeof cp.id}`);
    }
});
