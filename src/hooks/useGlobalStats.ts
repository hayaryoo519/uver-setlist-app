import { useMemo } from 'react';
import { DISCOGRAPHY } from '../data/discography';
import { useLives } from './queries/useLives';
import { useSongs } from './queries/useSongs';
import type { Live, Song } from '../types/api';

interface YearlyDetail {
    year: string;
    liveCount: number;
    totalSongs: number;
    uniqueSongsList: Set<string>;
}

interface TourSongEntry {
    count: number;
    lives: Array<{ id: number; date: string; venue: string; title: string | null }>;
    id?: number;
}

interface TourEntry {
    count: number;
    songCounts: Record<string, TourSongEntry>;
    latestDate: string;
    startDate: string;
    endDate: string;
}

interface SongCountEntry {
    count: number;
    id: number | null;
    title: string;
}

const normalizeSongTitle = (title: string | null | undefined): string => {
    if (!title) return "";
    if (title === "=") return "=";
    return title.toLowerCase().replace(/[!'#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/g, "").replace(/\s+/g, "");
};

export const useGlobalStats = () => {
    const { data: allLives = [], isLoading: livesLoading, error: livesError } = useLives({ include_setlists: true });
    const { data: allSongs = [], isLoading: songsLoading } = useSongs();

    const loading = livesLoading || songsLoading;
    const error = livesError ? livesError.message : null;

    const stats = useMemo(() => {
        if (!allLives.length) return null;

        const formatDate = (dateStr: string | null | undefined): string => {
            if (!dateStr) return '';
            const d = new Date(dateStr.split('T')[0].replace(/-/g, '/'));
            return d.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.');
        };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const pastLives = (allLives as Live[]).filter(live => new Date(live.date) <= today);
        const upcomingLives = (allLives as Live[]).filter(live => new Date(live.date) > today)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(live => ({ ...live, date: formatDate(live.date) }));

        const totalLives = pastLives.length;

        const totalSongsPerformed = pastLives.reduce((acc, live) => acc + (live.setlist ? live.setlist.length : 0), 0);

        const yearlyDetails: Record<string, YearlyDetail> = {};
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
            .sort((a, b) => Number(a.year) - Number(b.year))
            .map(data => ({
                year: data.year,
                liveCount: data.liveCount,
                totalSongs: data.totalSongs,
                uniqueSongs: data.uniqueSongsList.size,
                avgSongs: (data.totalSongs / data.liveCount).toFixed(1)
            }));

        const tourData: Record<string, TourEntry> = {};
        pastLives.forEach(live => {
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

            if (new Date(live.date).getTime() > new Date(tourData[title].endDate).getTime()) {
                tourData[title].endDate = live.date;
            }
            if (new Date(live.date).getTime() < new Date(tourData[title].startDate).getTime()) {
                tourData[title].startDate = live.date;
            }
            if (new Date(live.date).getTime() > new Date(tourData[title].latestDate).getTime()) {
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
                    title: live.title
                });

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

        const recentLives = [...pastLives]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 10)
            .map(live => ({ ...live, date: formatDate(live.date) }));

        const songAlbumMap = new Map<string, string>();

        DISCOGRAPHY.forEach(release => {
            if (release.type === 'ALBUM') {
                release.songs.forEach((songTitle: string) => {
                    const norm = normalizeSongTitle(songTitle);
                    if (!songAlbumMap.has(norm)) {
                        songAlbumMap.set(norm, release.title);
                    }
                });
            }
        });

        DISCOGRAPHY.forEach(release => {
            if (release.type === 'SINGLE') {
                release.songs.forEach((songTitle: string) => {
                    const norm = normalizeSongTitle(songTitle);
                    if (!songAlbumMap.has(norm)) {
                        songAlbumMap.set(norm, "Singles");
                    }
                });
            }
        });

        const albumMap = new Map<string, number>();
        pastLives.forEach(live => {
            const list = live.setlist || [];
            list.forEach(song => {
                const norm = normalizeSongTitle(song.title);
                const album = songAlbumMap.get(norm);
                if (album) {
                    albumMap.set(album, (albumMap.get(album) || 0) + 1);
                }
            });
        });

        const albumStats: Array<{ name: string; value: number }> = [];

        const singlesCount = albumMap.get("Singles") || 0;
        albumStats.push({ name: "Singles", value: singlesCount });

        DISCOGRAPHY.forEach(release => {
            if (release.type === 'ALBUM') {
                const count = albumMap.get(release.title) || 0;
                albumStats.push({ name: release.title, value: count });
            }
        });

        const globalSongCounts: Record<string, SongCountEntry> = {};
        pastLives.forEach(live => {
            const list = live.setlist || [];
            list.forEach(song => {
                if (!song || !song.title) return;
                if (!globalSongCounts[song.title]) {
                    globalSongCounts[song.title] = { count: 0, id: song.id ?? null, title: song.title };
                }
                globalSongCounts[song.title].count += 1;
                if (song.id && !globalSongCounts[song.title].id) {
                    globalSongCounts[song.title].id = song.id;
                }
            });
        });

        const songDataMap = new Map<string, { id: number; image_url: string | null }>();
        const songIdMap = new Map<string, number>();
        (allSongs as Song[]).forEach(s => {
            songDataMap.set(s.title, { id: s.id, image_url: s.image_url });
            songIdMap.set(s.title, s.id);
        });

        const globalSongRanking = Object.values(globalSongCounts)
            .map(s => {
                const songData = songDataMap.get(s.title);
                return {
                    ...s,
                    id: s.id || (songData ? songData.id : null),
                    image_url: songData ? songData.image_url : null,
                    percentage: ((s.count / totalLives) * 100).toFixed(1)
                };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 50);

        return {
            totalLives,
            totalSongsPerformed,
            yearlyDetailedStats,
            tourRanking,
            currentTour,
            recentLives,
            allLives,
            albumStats,
            songAlbumMap,
            songIdMap,
            songDataMap,
            globalSongRanking,
            upcomingLives
        };
    }, [allLives, allSongs]);

    return { ...stats, loading, error };
};
