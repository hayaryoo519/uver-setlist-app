import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { setlists } from '../data/setlists'; // Keep using local setlist data for now
import { lives as localLives } from '../data/lives'; // Fallback or reference

// Logic to calculate stats from a list of Live Objects
export const useLiveStatsLogic = (myLives, allSongs = []) => {
    if (!myLives || myLives.length === 0) {
        return {
            totalLives: 0,
            uniqueSongs: 0,
            venueTypeStats: [],
            yearlyStats: [],
            songRanking: [],
            albumStats: [],
            myLives: [],
            firstLive: null
        };
    }

    // Sort by date asc
    const sortedLives = [...myLives].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Create a map for quick song metadata lookup
    const songMetaMap = new Map();
    allSongs.forEach(song => {
        if (song.title) songMetaMap.set(song.title, song);
    });

    // Song Counts & Album Stats
    const songMap = new Map();
    const albumMap = new Map();

    // We need to map the API live objects to the setlists.
    sortedLives.forEach(live => {
        const list = setlists[live.id] || [];
        list.forEach(song => {
            // Count Song
            const count = songMap.get(song.title) || 0;
            songMap.set(song.title, count + 1);

            // Count Album (using metadata from DB)
            const meta = songMetaMap.get(song.title);
            if (meta && meta.album) {
                const albumCount = albumMap.get(meta.album) || 0;
                albumMap.set(meta.album, albumCount + 1);
            } else {
                // Unknown Album
                const unknownCount = albumMap.get('Unknown') || 0;
                albumMap.set('Unknown', unknownCount + 1);
            }
        });
    });

    const songRanking = Array.from(songMap.entries())
        .map(([title, count]) => ({ title, count }))
        .sort((a, b) => b.count - a.count);

    // Unique Songs based on the setlists we found
    const uniqueSongs = songMap.size;

    // Album Stats Array
    const albumStats = Array.from(albumMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    // Yearly Stats
    const yearlyMap = new Map();
    sortedLives.forEach(live => {
        const dateStr = live.date || live.attended_at;
        if (dateStr) {
            const year = new Date(dateStr).getFullYear().toString();
            yearlyMap.set(year, (yearlyMap.get(year) || 0) + 1);
        }
    });

    const yearlyStats = [];
    const startYear = 2005;
    const currentYear = new Date().getFullYear();
    for (let y = startYear; y <= currentYear; y++) {
        const yearStr = y.toString();
        yearlyStats.push({
            year: y,
            count: yearlyMap.get(yearStr) || 0
        });
    }

    // Venue Type Stats
    const typeMap = new Map();
    sortedLives.forEach(live => {
        const type = live.type || 'Hall'; // Default if missing
        typeMap.set(type, (typeMap.get(type) || 0) + 1);
    });

    const venueTypeStats = Array.from(typeMap.entries())
        .map(([type, count]) => ({ name: type, value: count }));

    return {
        totalLives: sortedLives.length,
        uniqueSongs,
        venueTypeStats,
        yearlyStats,
        songRanking,
        albumStats, // New
        myLives: sortedLives,
        firstLive: sortedLives.length > 0 ? sortedLives[0] : null
    };
};

export const useLiveStats = () => {
    const { currentUser } = useAuth();
    const [attendedLives, setAttendedLives] = useState([]);
    const [allSongs, setAllSongs] = useState([]); // Store fetched songs
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setLoading(false);
                    return;
                }

                // Fetch Attended Lives
                const livesRes = await fetch('http://localhost:4000/api/users/me/attended_lives', {
                    headers: { 'token': token }
                });

                // Fetch All Songs (Metadata)
                const songsRes = await fetch('http://localhost:4000/api/songs', {
                    headers: { 'token': token } // Optional auth if required
                });

                if (livesRes.ok && songsRes.ok) {
                    const livesData = await livesRes.json();
                    const songsData = await songsRes.json();
                    setAttendedLives(livesData);
                    setAllSongs(songsData);
                } else {
                    console.error("Failed to fetch data");
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [currentUser]);

    // Memoize the logic result, including allSongs dependency
    const stats = useMemo(() => useLiveStatsLogic(attendedLives, allSongs), [attendedLives, allSongs]);

    return {
        ...stats,
        loading
    };
};
