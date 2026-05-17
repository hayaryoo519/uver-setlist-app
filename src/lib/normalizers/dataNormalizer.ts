import { Live, Song, SetlistEntry } from '../../types/api';

/**
 * ライブデータの正規化を行う。
 * APIからのレスポンスが不完全な場合でも、UIがクラッシュしないように安全なデフォルト値を保証する。
 */
export function normalizeLive(raw: any): Live {
    if (!raw) {
        console.warn('[Normalization] Received null/undefined live data');
        return {
            id: 0,
            tour_name: 'Unknown Tour',
            title: 'Unknown Live',
            date: '',
            venue: 'Unknown Venue',
            type: 'HALL',
            special_note: null,
            setlist: []
        };
    }

    // 必須フィールドの欠落チェックとログ
    if (!raw.id || !raw.tour_name || !raw.date) {
        console.warn('[Normalization] Potentially malformed live data detected:', raw);
    }

    return {
        id: Number(raw.id) || 0,
        tour_name: raw.tour_name || raw.title || 'Unknown Tour',
        title: raw.title || null,
        date: safeDate(raw.date || raw.attended_at || raw.live_date),
        venue: raw.venue || 'Unknown Venue',
        type: raw.type || 'HALL',
        special_note: raw.special_note || null,
        setlist: Array.isArray(raw.setlist) ? raw.setlist.map(normalizeSetlistEntry) : [],
        attended_at: raw.attended_at ? safeDate(raw.attended_at) : undefined,
        created_at: raw.created_at ? safeDate(raw.created_at) : undefined,
        prediction_count: Number(raw.prediction_count) || 0,
        setlist_status: raw.setlist_status || null,
        is_closed: !!raw.is_closed,
        has_predicted: !!raw.has_predicted,
        my_prediction_id: raw.my_prediction_id || null
    };
}

/**
 * セットリストエントリーの正規化
 */
export function normalizeSetlistEntry(raw: any): SetlistEntry {
    return {
        id: Number(raw.id) || 0,
        title: raw.title || 'Unknown Song',
        order: Number(raw.order) || Number(raw.position) || 0,
        is_encore: !!raw.is_encore,
        album: raw.album || null,
        note: raw.note || null,
        position: Number(raw.position) || Number(raw.order) || 0
    };
}

/**
 * 楽曲データの正規化
 */
export function normalizeSong(raw: any): Song {
    if (!raw) {
        return {
            id: 0,
            title: 'Unknown Song',
            album: null,
            release_year: null,
            mv_url: null,
            author: null,
            image_url: null
        };
    }

    return {
        id: Number(raw.id) || 0,
        title: raw.title || 'Unknown Song',
        album: raw.album || null,
        release_year: Number(raw.release_year) || null,
        mv_url: raw.mv_url || null,
        author: raw.author || null,
        image_url: raw.image_url || null,
        spotify_track_id: raw.spotify_track_id || null,
        yt_video_id: raw.yt_video_id || null
    };
}

/**
 * 日付の安全な変換
 */
export function safeDate(dateStr: any): string {
    if (!dateStr) return '';
    // Safari は YYYY.MM.DD や "YYYY-MM-DD HH:MM:SS" を拒否する。ISO 8601 に正規化する
    const normalized = typeof dateStr === 'string'
        ? dateStr.replace(/\./g, '-').replace(' ', 'T')
        : dateStr;
    const d = new Date(normalized);
    if (isNaN(d.getTime())) {
        console.warn(`[Normalization] Invalid date string: ${dateStr}`);
        return typeof dateStr === 'string' ? dateStr : '';
    }
    return d.toISOString();
}
