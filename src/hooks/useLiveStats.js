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
            venueRanking: [],
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
    const songStatsMap = new Map(); // title -> { count: 0, lives: [] }
    const albumMap = new Map();

    // We need to map the API live objects to the setlists.
    sortedLives.forEach(live => {
        // Generate key from date: YYYY-MM-DD -> live_YYYYMMDD_01
        let list = [];
        if (live.date) {
            const d = new Date(live.date);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const key = `live_${yyyy}${mm}${dd}_01`;
            list = setlists[key] || [];
        }

        // Fallback: Check if live.id matches (for legacy or direct mapping)
        if (list.length === 0 && setlists[live.id]) {
            list = setlists[live.id];
        }

        list.forEach(song => {
            // Count Song & Store Live
            if (!songStatsMap.has(song.title)) {
                songStatsMap.set(song.title, { count: 0, lives: [] });
            }
            const stat = songStatsMap.get(song.title);
            stat.count += 1;
            // Avoid duplicate lives for same song (e.g. played twice in encore?)
            // Usually not needed if we want to count performances, but for "which lives" unique is better?
            // Let's just push for now. 
            stat.lives.push(live);

            // Count Album (using metadata from DB)
            const meta = songMetaMap.get(song.title);
            if (meta && meta.album) {
                // Filter out Singles as per user request
                if (meta.album === 'Single' || meta.album === 'Others' || meta.album === 'Side Projects') {
                    return;
                }

                const albumCount = albumMap.get(meta.album) || 0;
                albumMap.set(meta.album, albumCount + 1);
            }
            // If no meta or no album, simply skip. Do not count as Unknown.
        });
    });

    const songRanking = Array.from(songStatsMap.entries())
        .map(([title, stat]) => {
            const meta = songMetaMap.get(title);
            return {
                title,
                count: stat.count,
                lives: stat.lives,
                album: meta ? meta.album : 'Unknown'
            };
        })
        .sort((a, b) => b.count - a.count);

    // Unique Songs based on the setlists we found
    const uniqueSongs = songStatsMap.size;

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

    // Venue Stats (Ranking)
    const venueMap = new Map();
    sortedLives.forEach(live => {
        const venue = live.venue || 'Unknown';
        venueMap.set(venue, (venueMap.get(venue) || 0) + 1);
    });

    const venueRanking = Array.from(venueMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    return {
        totalLives: sortedLives.length,
        uniqueSongs,
        venueTypeStats,
        venueRanking, // New
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
                const livesRes = await fetch('/api/users/me/attended_lives', {
                    headers: { 'token': token }
                });

                // Fetch All Songs (Metadata)
                const songsRes = await fetch('/api/songs', {
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
