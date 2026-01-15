import { useState, useEffect, useMemo } from 'react';


export const useGlobalStats = () => {
    const [allSongs, setAllSongs] = useState([]);
    const [allLives, setAllLives] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [livesRes, songsRes] = await Promise.all([
                    fetch('/api/lives?include_setlists=true'),
                    fetch('/api/songs')
                ]);

                if (livesRes.ok && songsRes.ok) {
                    const livesData = await livesRes.json();
                    const songsData = await songsRes.json();
                    setAllLives(livesData);
                    setAllSongs(songsData);
                }
            } catch (e) {
                console.error("Failed to fetch data for global stats", e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const stats = useMemo(() => {
        if (!allLives.length) return null;

        const totalLives = allLives.length;

        // Total Songs: sum lengths of live.setlist
        const totalSongsPerformed = allLives.reduce((acc, live) => acc + (live.setlist ? live.setlist.length : 0), 0);

        // Detailed Yearly Stats
        const yearlyDetails = {};
        allLives.forEach(live => {
            const year = live.date.split('-')[0];
            if (!yearlyDetails[year]) {
                yearlyDetails[year] = {
                    year,
                    liveCount: 0,
                    totalSongs: 0,
                    uniqueSongsList: new Set()
                };
            }
            yearlyDetails[year].liveCount += 1;
            const setlist = live.setlist || [];
            yearlyDetails[year].totalSongs += setlist.length;
            setlist.forEach(song => yearlyDetails[year].uniqueSongsList.add(song.title));
        });

        const yearlyDetailedStats = Object.values(yearlyDetails)
            .sort((a, b) => a.year - b.year)
            .map(data => ({
                year: data.year,
                liveCount: data.liveCount,
                totalSongs: data.totalSongs,
                uniqueSongs: data.uniqueSongsList.size,
                avgSongs: (data.totalSongs / data.liveCount).toFixed(1)
            }));

        // Tour Ranking with Song Counts & Duration
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
            tourData[title].count += 1;

            if (new Date(live.date) > new Date(tourData[title].endDate)) {
                tourData[title].endDate = live.date;
            }
            if (new Date(live.date) < new Date(tourData[title].startDate)) {
                tourData[title].startDate = live.date;
            }
            if (new Date(live.date) > new Date(tourData[title].latestDate)) {
                tourData[title].latestDate = live.date;
            }

            const setlist = live.setlist || [];
            setlist.forEach(song => {
                if (!tourData[title].songCounts[song.title]) {
                    tourData[title].songCounts[song.title] = { count: 0, lives: [] };
                }
                tourData[title].songCounts[song.title].count += 1;
                tourData[title].songCounts[song.title].lives.push({
                    id: live.id,
                    date: live.date,
                    venue: live.venue,
                    title: live.title // Added title for Day/Night distinction
                });

                // Capture ID if available
                if (song.id && !tourData[title].songCounts[song.title].id) {
                    tourData[title].songCounts[song.title].id = song.id;
                }
            });
        });

        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            return d.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.');
        };

        const tourStats = Object.entries(tourData)
            .map(([name, data]) => {
                const totalSongs = Object.values(data.songCounts).reduce((sum, songInfo) => sum + songInfo.count, 0);
                const songRanking = Object.entries(data.songCounts)
                    .map(([songTitle, songInfo]) => ({
                        title: songTitle,
                        // id: songInfo.id, // ID no longer strictly needed for linking!
                        count: songInfo.count,
                        lives: songInfo.lives.map(l => ({ ...l, date: formatDate(l.date) })),
                        percentage: ((songInfo.count / data.count) * 100).toFixed(1)
                    }))
                    .sort((a, b) => b.count - a.count);

                return {
                    name,
                    liveCount: data.count,
                    totalSongs,
                    songRanking,
                    latestDate: formatDate(data.latestDate),
                    startDate: formatDate(data.startDate),
                    endDate: formatDate(data.endDate)
                };
            });

        const tourRanking = [...tourStats]
            .sort((a, b) => b.liveCount - a.liveCount)
            .slice(0, 5);

        const currentTour = [...tourStats]
            .sort((a, b) => b.latestDate.localeCompare(a.latestDate))[0];

        const recentLives = [...allLives]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 3)
            .map(live => ({ ...live, date: formatDate(live.date) }));

        // --- Album Stats (Global) ---
        const songMetaMap = new Map();
        allSongs.forEach(song => {
            if (song.title) songMetaMap.set(song.title, song.album);
        });

        const albumMap = new Map();
        allLives.forEach(live => {
            const list = live.setlist || [];
            list.forEach(song => {
                const album = songMetaMap.get(song.title);
                if (album) {
                    albumMap.set(album, (albumMap.get(album) || 0) + 1);
                } else {
                    albumMap.set('Unknown', (albumMap.get('Unknown') || 0) + 1);
                }
            });
        });

        const albumStats = Array.from(albumMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        // --- Global Song Ranking ---
        const globalSongCounts = {};
        allLives.forEach(live => {
            const list = live.setlist || [];
            list.forEach(song => {
                if (!song || !song.title) return;
                if (!globalSongCounts[song.title]) {
                    globalSongCounts[song.title] = { count: 0, id: song.id, title: song.title };
                    // Note: song.id might be missing in setlist depending on query, 
                    // but usually available if valid FK. 
                    // If missing, we might need lookup. 
                    // Only allSongs has guaranteed IDs.
                }
                globalSongCounts[song.title].count += 1;
                // Ensure ID is captured if available from first occurrence
                if (song.id && !globalSongCounts[song.title].id) {
                    globalSongCounts[song.title].id = song.id;
                }
            });
        });

        // Map titles to IDs using allSongs if missing
        const songIdMap = new Map();
        allSongs.forEach(s => songIdMap.set(s.title, s.id));

        const globalSongRanking = Object.values(globalSongCounts)
            .map(s => ({
                ...s,
                id: s.id || songIdMap.get(s.title), // Fallback to allSongs lookup
                percentage: ((s.count / totalLives) * 100).toFixed(1)
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 50); // Keep top 50 in stats, Dashboard can slice 10

        return {
            totalLives,
            totalSongsPerformed,
            yearlyDetailedStats,
            tourRanking,
            currentTour,
            recentLives,
            allLives,
            albumStats,
            songAlbumMap: songMetaMap,
            songIdMap,
            globalSongRanking
        };
    }, [allLives, allSongs]);

    return { ...stats, loading };
};
