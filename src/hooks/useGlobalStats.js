import { useMemo } from 'react';
import { lives } from '../data/lives';
import { setlists } from '../data/setlists';

export const useGlobalStats = () => {
    return useMemo(() => {
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

        // Tour Ranking with Song Counts
        const tourData = {};
        lives.forEach(live => {
            const title = live.tourTitle;
            if (!tourData[title]) {
                tourData[title] = { count: 0, songCounts: {}, latestDate: live.date };
            }
            tourData[title].count += 1;
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
                    latestDate: data.latestDate
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

        return {
            totalLives,
            totalSongsPerformed,

            yearlyDetailedStats,
            tourRanking,
            currentTour,
            recentLives,
            allLives: lives
        };
    }, []);
};
