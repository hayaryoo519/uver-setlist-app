import { useState, useEffect, useMemo } from 'react';
import { DISCOGRAPHY } from '../data/discography';

// Helper for normalization
const normalizeSongTitle = (title) => {
    if (!title) return "";
    if (title === "=") return "=";
    return title.toLowerCase().replace(/[!'#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/g, "").replace(/\s+/g, "");
};

export const useGlobalStats = () => {
    const [allSongs, setAllSongs] = useState([]);
    const [allLives, setAllLives] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [livesRes, songsRes] = await Promise.all([
                    fetch('/api/lives?include_setlists=true'),
                    fetch('/api/songs')
                ]);

                if (!livesRes.ok) throw new Error(`Lives API Error: ${livesRes.status}`);
                if (!songsRes.ok) throw new Error(`Songs API Error: ${songsRes.status}`);

                const livesData = await livesRes.json();
                const songsData = await songsRes.json();
                setAllLives(livesData);
                setAllSongs(songsData);
            } catch (e) {
                console.error("Failed to fetch data for global stats", e);
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const stats = useMemo(() => {
        if (!allLives.length) return null;

        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            return d.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.');
        };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Separate Past and Future
        const pastLives = allLives.filter(live => new Date(live.date) < today);
        const upcomingLives = allLives.filter(live => new Date(live.date) >= today)
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .map(live => ({ ...live, date: formatDate(live.date) }));

        const totalLives = pastLives.length;

        // Total Songs: sum lengths of live.setlist (only for past lives)
        const totalSongsPerformed = pastLives.reduce((acc, live) => acc + (live.setlist ? live.setlist.length : 0), 0);

        // Detailed Yearly Stats
        const yearlyDetails = {};
        pastLives.forEach(live => {
            const year = live.date ? live.date.split('-')[0] : 'Unknown';
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
        pastLives.forEach(live => {
            // Filter out Festivals/Events from Tour Analysis
            const isFestival = (
                live.type === 'FESTIVAL' ||
                live.type === 'EVENT' ||
                (live.tour_name && (live.tour_name.toUpperCase().includes('FES.') || live.tour_name.toUpperCase().includes('FESTIVAL')))
            );
            if (isFestival) return;

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
            .sort((a, b) => b.latestDate.localeCompare(a.latestDate));

        const currentTour = [...tourStats]
            .sort((a, b) => b.latestDate.localeCompare(a.latestDate))[0];

        // Recent lives (Archive Top 10)
        const recentLives = [...pastLives]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10)
            .map(live => ({ ...live, date: formatDate(live.date) }));

        // --- Album Stats (Global) - NEW LOGIC ---
        // --- Album Stats (Global) - NEW LOGIC ---
        // 1. Create Song -> Album Map from DISCOGRAPHY (Normalized)
        const songAlbumMap = new Map();

        // Pass 1: Map Albums First (Priority)
        DISCOGRAPHY.forEach(release => {
            if (release.type === 'ALBUM') {
                release.songs.forEach(songTitle => {
                    const norm = normalizeSongTitle(songTitle);
                    if (!songAlbumMap.has(norm)) {
                        songAlbumMap.set(norm, release.title);
                    }
                });
            }
        });

        // Pass 2: Map Singles (Only if not in Album -> B-sides, etc.)
        DISCOGRAPHY.forEach(release => {
            if (release.type === 'SINGLE') {
                release.songs.forEach(songTitle => {
                    const norm = normalizeSongTitle(songTitle);
                    if (!songAlbumMap.has(norm)) {
                        songAlbumMap.set(norm, "Singles");
                    }
                });
            }
        });

        // 2. Count Albums from Past Lives
        const albumMap = new Map();
        pastLives.forEach(live => {
            const list = live.setlist || [];
            list.forEach(song => {
                const norm = normalizeSongTitle(song.title);
                const album = songAlbumMap.get(norm);

                // Count if mapped (Album Name or "Singles")
                if (album) {
                    albumMap.set(album, (albumMap.get(album) || 0) + 1);
                }
            });
        });

        // Sort by DISCOGRAPHY order (Release Order)
        const albumStats = [];

        // Add Summarized Singles FIRST
        const singlesCount = albumMap.get("Singles") || 0;
        albumStats.push({ name: "Singles", value: singlesCount });

        DISCOGRAPHY.forEach(release => {
            if (release.type === 'ALBUM') {
                const count = albumMap.get(release.title) || 0;
                albumStats.push({ name: release.title, value: count });
            }
        });

        // --- Global Song Ranking ---
        const globalSongCounts = {};
        pastLives.forEach(live => {
            const list = live.setlist || [];
            list.forEach(song => {
                if (!song || !song.title) return;
                if (!globalSongCounts[song.title]) {
                    globalSongCounts[song.title] = { count: 0, id: song.id, title: song.title };
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
            songAlbumMap: songAlbumMap,
            songIdMap,
            globalSongRanking,
            upcomingLives
        };
    }, [allLives, allSongs]);

    return { ...stats, loading, error };
};
