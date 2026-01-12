import { useState, useEffect, useMemo } from 'react';
import { lives } from '../data/lives';
import { setlists } from '../data/setlists';

export const useGlobalStats = () => {
    const [allSongs, setAllSongs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSongs = async () => {
            try {
                // Fetch song metadata for album info
                const res = await fetch('http://localhost:4000/api/songs');
                if (res.ok) {
                    const data = await res.json();
                    setAllSongs(data);
                }
            } catch (e) {
                console.error("Failed to fetch songs for global stats", e);
            } finally {
                setLoading(false);
            }
        };
        fetchSongs();
    }, []);

    const stats = useMemo(() => {
        const totalLives = lives.length;

        // Total Songs Performed (sum of all setlist lengths)
        const totalSongsPerformed = Object.values(setlists).reduce((acc, list) => acc + list.length, 0);

        // Detailed Yearly Stats
        const yearlyDetails = {};
        lives.forEach(live => {
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
            const setlist = setlists[live.id] || [];
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
        lives.forEach(live => {
            const title = live.tourTitle;
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

            // Track start/end dates
            if (new Date(live.date) > new Date(tourData[title].endDate)) {
                tourData[title].endDate = live.date;
            }
            if (new Date(live.date) < new Date(tourData[title].startDate)) {
                tourData[title].startDate = live.date;
            }
            // Keep "latestDate" as logic for sorting recent tours (same as endDate effectively)
            if (new Date(live.date) > new Date(tourData[title].latestDate)) {
                tourData[title].latestDate = live.date;
            }

            // Add songs from this live's setlist
            const setlist = setlists[live.id] || [];
            setlist.forEach(song => {
                if (!tourData[title].songCounts[song.title]) {
                    tourData[title].songCounts[song.title] = { count: 0, lives: [] };
                }
                tourData[title].songCounts[song.title].count += 1;
                tourData[title].songCounts[song.title].lives.push({
                    id: live.id,
                    date: live.date,
                    venue: live.venue
                });
            });
        });

        const tourStats = Object.entries(tourData)
            .map(([name, data]) => {
                const totalSongs = Object.values(data.songCounts).reduce((sum, songInfo) => sum + songInfo.count, 0);
                const songRanking = Object.entries(data.songCounts)
                    .map(([songTitle, songInfo]) => ({
                        title: songTitle,
                        count: songInfo.count,
                        lives: songInfo.lives,
                        percentage: ((songInfo.count / data.count) * 100).toFixed(1)
                    }))
                    .sort((a, b) => b.count - a.count);

                return {
                    name,
                    liveCount: data.count,
                    totalSongs,
                    songRanking,
                    latestDate: data.latestDate,
                    startDate: data.startDate,
                    endDate: data.endDate
                };
            });

        const tourRanking = [...tourStats]
            .sort((a, b) => b.liveCount - a.liveCount)
            .slice(0, 5);

        // Current Tour (Latest one)
        const currentTour = [...tourStats]
            .sort((a, b) => new Date(b.latestDate) - new Date(a.latestDate))[0];

        // Recent Lives
        const recentLives = [...lives].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);

        // --- Album Stats (Global) ---
        // Create Map: Song Title -> Album
        const songMetaMap = new Map();
        allSongs.forEach(song => {
            if (song.title) songMetaMap.set(song.title, song.album);
        });

        const albumMap = new Map();
        // Iterate all setlists
        Object.values(setlists).forEach(list => {
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

        return {
            totalLives,
            totalSongsPerformed,
            yearlyDetailedStats,
            tourRanking,
            currentTour,
            recentLives,
            allLives: lives,
            albumStats // New Global Album Stats
        };
    }, [allSongs]);

    return { ...stats, loading };
};
