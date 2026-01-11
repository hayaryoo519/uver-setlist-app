import { useMemo } from 'react';
import { lives } from '../data/lives';
import { setlists } from '../data/setlists';
import { getAttendedLives } from '../utils/storage';

export const useLiveStats = () => {
    // In a real app, attendance might be passed in or fetched via context/store
    // For now we read from storage on every render or expect standard usage
    const attendedIds = getAttendedLives();

    const stats = useMemo(() => {
        const myLives = lives.filter(live => attendedIds.includes(live.id));

        // Sort by date asc
        myLives.sort((a, b) => new Date(a.date) - new Date(b.date));

        const firstLive = myLives.length > 0 ? myLives[0] : null;

        // Song Counts
        const songMap = new Map();
        myLives.forEach(live => {
            const list = setlists[live.id] || [];
            list.forEach(song => {
                const count = songMap.get(song.title) || 0;
                songMap.set(song.title, count + 1);
            });
        });

        const songRanking = Array.from(songMap.entries())
            .map(([title, count]) => ({ title, count }))
            .sort((a, b) => b.count - a.count);

        // Yearly Stats
        const yearlyMap = new Map();
        myLives.forEach(live => {
            const year = live.date.split('-')[0];
            yearlyMap.set(year, (yearlyMap.get(year) || 0) + 1);
        });

        const yearlyStats = Array.from(yearlyMap.entries())
            .map(([year, count]) => ({ year, count }))
            .sort((a, b) => a.year.localeCompare(b.year)); // Sort by year

        // Venue Type Stats
        const typeMap = new Map();
        myLives.forEach(live => {
            const type = live.type || 'Unknown';
            typeMap.set(type, (typeMap.get(type) || 0) + 1);
        });

        const venueTypeStats = Array.from(typeMap.entries())
            .map(([type, count]) => ({ name: type, value: count }));

        return {
            totalLives: myLives.length,
            firstLive,
            songRanking,
            uniqueSongs: songMap.size,
            yearlyStats,
            venueTypeStats,
            myLives // Return raw list if needed
        };
    }, [attendedIds]); // Dependency on simple array from storage might not trigger update if ref doesn't change?
    // Note calls to getAttendedLives() inside component render is safe but we usually pass state.
    // We will assume the consumer passes the attendedIds to this hook or we use state inside.

    // Changing approach: Hook should probably take attendedIds as argument to be pure
    return stats;
};

// Revised hook that accepts ids
export const useLiveStatsLogic = (attendedIds) => {
    return useMemo(() => {
        const myLives = lives.filter(live => attendedIds.includes(live.id));

        // Sort by date asc
        myLives.sort((a, b) => new Date(a.date) - new Date(b.date));

        const firstLive = myLives.length > 0 ? myLives[0] : null;

        // Song Counts with Live Details
        const songMap = new Map();
        myLives.forEach(live => {
            const list = setlists[live.id] || [];
            list.forEach(song => {
                if (!songMap.has(song.title)) {
                    songMap.set(song.title, { count: 0, lives: [] });
                }
                const songData = songMap.get(song.title);
                songData.count += 1;
                songData.lives.push({
                    id: live.id,
                    date: live.date,
                    venue: live.venue,
                    tourTitle: live.tourTitle
                });
            });
        });

        const songRanking = Array.from(songMap.entries())
            .map(([title, data]) => ({
                title,
                count: data.count,
                lives: data.lives.sort((a, b) => new Date(b.date) - new Date(a.date)) // Sort by date desc
            }))
            .sort((a, b) => b.count - a.count);

        // Yearly Stats
        const yearlyMap = new Map();
        myLives.forEach(live => {
            const year = live.date.split('-')[0];
            yearlyMap.set(year, (yearlyMap.get(year) || 0) + 1);
        });

        // Ensure current year range or all years?
        // Let's just return what we have
        const yearlyStats = Array.from(yearlyMap.entries())
            .map(([year, count]) => ({ year, count }))
            .sort((a, b) => a.year.localeCompare(b.year));

        // Venue Type Stats
        const typeMap = new Map();
        myLives.forEach(live => {
            const type = live.type || 'Unknown';
            typeMap.set(type, (typeMap.get(type) || 0) + 1);
        });

        const venueTypeStats = Array.from(typeMap.entries())
            .map(([type, count]) => ({ name: type, value: count }));

        return {
            totalLives: myLives.length,
            firstLive,
            songRanking,
            uniqueSongs: songMap.size,
            yearlyStats,
            venueTypeStats,
            myLives
        };
    }, [attendedIds]);
}
