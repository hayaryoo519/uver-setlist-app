import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { setlists } from '../data/setlists';
import { DISCOGRAPHY } from '../data/discography';
import { useAttendedLives } from './queries/useUser';
import { useSongs } from './queries/useSongs';
import type { Live, Song } from '../types/api';

interface SongStat {
    count: number;
    lives: Live[];
}

export const useLiveStatsLogic = (myLives: Live[], allSongs: Song[] = []) => {
    if (!myLives || myLives.length === 0) {
        return {
            totalLives: 0,
            uniqueSongs: 0,
            venueTypeStats: [] as Array<{ name: string; value: number }>,
            yearlyStats: [] as Array<{ year: number; count: number }>,
            songRanking: [] as Array<{ title: string; count: number; lives: Live[]; album: string }>,
            albumStats: [] as Array<{ name: string; value: number }>,
            venueRanking: [] as Array<{ name: string; count: number }>,
            myLives: [] as Live[],
            firstLive: null as Live | null
        };
    }

    const sortedLives = [...myLives].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const songMetaMap = new Map<string, Song>();
    allSongs.forEach(song => {
        if (song.title) songMetaMap.set(song.title, song);
    });

    const songAlbumMap = new Map<string, string>();
    DISCOGRAPHY.forEach(release => {
        if (release.type === 'ALBUM') {
            release.songs.forEach((songTitle: string) => {
                if (!songAlbumMap.has(songTitle)) {
                    songAlbumMap.set(songTitle, release.title);
                }
            });
        }
    });

    const songStatsMap = new Map<string, SongStat>();
    const albumMap = new Map<string, number>();

    sortedLives.forEach(live => {
        let list: Array<{ title: string; id?: number }> = (live.setlist || []) as Array<{ title: string; id?: number }>;

        if (list.length === 0 && live.date) {
            const d = new Date(live.date);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const key = `live_${yyyy}${mm}${dd}_01`;
            list = (setlists as Record<string, Array<{ title: string }>>)[key] || [];
        }

        if (list.length === 0 && (setlists as Record<string | number, unknown>)[live.id]) {
            list = (setlists as Record<string | number, Array<{ title: string }>>)[live.id] || [];
        }

        list.forEach(song => {
            if (!songStatsMap.has(song.title)) {
                songStatsMap.set(song.title, { count: 0, lives: [] });
            }
            const stat = songStatsMap.get(song.title)!;
            stat.count += 1;
            stat.lives.push(live);

            const albumName = songAlbumMap.get(song.title);
            if (albumName) {
                albumMap.set(albumName, (albumMap.get(albumName) || 0) + 1);
            }
        });
    });

    const songRanking = Array.from(songStatsMap.entries())
        .map(([title, stat]) => {
            const meta = songMetaMap.get(title);
            const albumName = songAlbumMap.get(title) || (meta ? meta.album ?? 'Unknown' : 'Unknown');
            return {
                title,
                count: stat.count,
                lives: stat.lives,
                album: albumName
            };
        })
        .sort((a, b) => b.count - a.count);

    const uniqueSongs = songStatsMap.size;

    const albumStats = Array.from(albumMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    const yearlyMap = new Map<string, number>();
    sortedLives.forEach(live => {
        const dateStr = live.date || live.attended_at;
        if (dateStr) {
            const year = new Date(dateStr).getFullYear().toString();
            yearlyMap.set(year, (yearlyMap.get(year) || 0) + 1);
        }
    });

    const yearlyStats: Array<{ year: number; count: number }> = [];
    const startYear = 2005;
    const currentYear = new Date().getFullYear();
    for (let y = startYear; y <= currentYear; y++) {
        yearlyStats.push({ year: y, count: yearlyMap.get(y.toString()) || 0 });
    }

    const typeMap = new Map<string, number>();
    sortedLives.forEach(live => {
        const type = live.type || 'Hall';
        typeMap.set(type, (typeMap.get(type) || 0) + 1);
    });

    const venueTypeStats = Array.from(typeMap.entries())
        .map(([type, count]) => ({ name: type, value: count }));

    const venueMap = new Map<string, number>();
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
        venueRanking,
        yearlyStats,
        songRanking,
        albumStats,
        myLives: sortedLives,
        firstLive: sortedLives.length > 0 ? sortedLives[0] : null
    };
};

export const useLiveStats = () => {
    const { currentUser } = useAuth();

    const { data: attendedLives = [], isLoading: livesLoading } = useAttendedLives(!!currentUser);
    const { data: allSongs = [], isLoading: songsLoading } = useSongs();

    const loading = livesLoading || songsLoading;

    const stats = useMemo(() => useLiveStatsLogic(attendedLives as Live[], allSongs as Song[]), [attendedLives, allSongs]);

    return { ...stats, loading };
};
