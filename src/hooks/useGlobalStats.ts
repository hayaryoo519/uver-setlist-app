import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { DISCOGRAPHY } from '../data/discography';
import { useLives } from './queries/useLives';
import { useSongs } from './queries/useSongs';
import { STALE_TIMES } from '../lib/queryClient';
import type { Song, Live } from '../types/api';
import { normalizeLive, normalizeSong } from '../lib/normalizers/dataNormalizer';

const normalizeSongTitle = (title: string | null | undefined): string => {
    if (!title) return "";
    if (title === "=") return "=";
    return title.toLowerCase().replace(/[!'#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/g, "").replace(/\s+/g, "");
};

interface StatsResponse {
    totalLives: number;
    totalSongsPerformed: number;
    yearlyDetailedStats: Array<{
        year: string;
        liveCount: number;
        totalSongs: number;
        uniqueSongs: number;
        avgSongs: string;
    }>;
    recentLives: any[];
    upcomingLives: any[];
    globalSongRanking: Array<{
        id: number;
        title: string;
        image_url: string | null;
        count: number;
        percentage: string;
    }>;
    tourRanking: any[];
    currentTour: any | null;
    songFrequencyMap: Record<string, number>;
}

export const useGlobalStats = () => {
    const { data: rawStatsData, isLoading: statsLoading, error: statsError, refetch } = useQuery<StatsResponse>({
        queryKey: ['stats'],
        queryFn: async () => {
            const res = await axios.get('/api/stats');
            return res.data;
        },
        staleTime: STALE_TIMES.stats,
    });

    // データ正規化レイヤー
    const statsData = useMemo(() => {
        if (!rawStatsData) return null;
        
        return {
            ...rawStatsData,
            recentLives: (rawStatsData.recentLives || []).map(l => normalizeLive(l)),
            upcomingLives: (rawStatsData.upcomingLives || []).map(l => normalizeLive(l)),
            globalSongRanking: (rawStatsData.globalSongRanking || []).map(s => ({
                ...s,
                ...normalizeSong(s)
            })),
            tourRanking: (rawStatsData.tourRanking || []).map(t => ({
                ...t,
                songRanking: (t.songRanking || []).map((s: any) => ({
                    ...s,
                    lives: (s.lives || []).map((l: any) => normalizeLive(l))
                }))
            })),
            currentTour: rawStatsData.currentTour ? {
                ...rawStatsData.currentTour,
                songRanking: (rawStatsData.currentTour.songRanking || []).map((s: any) => ({
                    ...s,
                    lives: (s.lives || []).map((l: any) => normalizeLive(l))
                }))
            } : null
        };
    }, [rawStatsData]);

    const { data: allLives = [] } = useLives({ include_setlists: true });
    const { data: rawAllSongs = [] } = useSongs();

    const normalizedAllSongs = useMemo(() => (rawAllSongs as any[]).map(s => normalizeSong(s)), [rawAllSongs]);

    const loading = statsLoading;
    const error = statsError ? (statsError as Error).message : null;

    const derived = useMemo(() => {
        const songAlbumMap = new Map<string, string>();
        DISCOGRAPHY.forEach((release: any) => {
            if (release.type === 'ALBUM') {
                release.songs.forEach((songTitle: string) => {
                    const norm = normalizeSongTitle(songTitle);
                    if (!songAlbumMap.has(norm)) songAlbumMap.set(norm, release.title);
                });
            }
        });
        DISCOGRAPHY.forEach((release: any) => {
            if (release.type === 'SINGLE') {
                release.songs.forEach((songTitle: string) => {
                    const norm = normalizeSongTitle(songTitle);
                    if (!songAlbumMap.has(norm)) songAlbumMap.set(norm, "Singles");
                });
            }
        });

        const songDataMap = new Map<string, { id: number; image_url: string | null }>();
        const songIdMap = new Map<string, number>();
        normalizedAllSongs.forEach(s => {
            songDataMap.set(s.title, { id: s.id, image_url: s.image_url });
            songIdMap.set(s.title, s.id);
        });

        if (!statsData) {
            return { songAlbumMap, songIdMap, songDataMap, albumStats: [] as Array<{ name: string; value: number }> };
        }

        const albumMap = new Map<string, number>();
        Object.entries(statsData.songFrequencyMap || {}).forEach(([title, count]) => {
            const norm = normalizeSongTitle(title);
            const album = songAlbumMap.get(norm);
            if (album) albumMap.set(album, (albumMap.get(album) || 0) + count);
        });

        const albumStats: Array<{ name: string; value: number }> = [];
        albumStats.push({ name: "Singles", value: albumMap.get("Singles") || 0 });
        DISCOGRAPHY.forEach((release: any) => {
            if (release.type === 'ALBUM') {
                albumStats.push({ name: release.title, value: albumMap.get(release.title) || 0 });
            }
        });

        return { albumStats, songAlbumMap, songIdMap, songDataMap };
    }, [statsData, normalizedAllSongs]);

    return {
        loading,
        error,
        refetch,
        allLives: (allLives as any[]).map(l => normalizeLive(l)),
        totalLives: statsData?.totalLives ?? 0,
        totalSongsPerformed: statsData?.totalSongsPerformed ?? 0,
        yearlyDetailedStats: statsData?.yearlyDetailedStats ?? [],
        recentLives: statsData?.recentLives ?? [],
        upcomingLives: statsData?.upcomingLives ?? [],
        globalSongRanking: statsData?.globalSongRanking ?? [],
        tourRanking: statsData?.tourRanking ?? [],
        currentTour: statsData?.currentTour ?? null,
        songFrequencyMap: statsData?.songFrequencyMap ?? {},
        ...derived,
    };
};

