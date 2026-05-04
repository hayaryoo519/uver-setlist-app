const router = require('express').Router();
const db = require('../db');
const { normalizeVenueName } = require('../utils/songTranslations');

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    // node:20-slim は ICU データが限定的なため toLocaleDateString は使わない
    const [year, month, day] = dateStr.split('T')[0].split(' ')[0].split('-');
    if (!year || !month || !day) return dateStr;
    return `${year}.${month}.${day}`;
};

router.get('/', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const [
            basicRes,
            yearlyRes,
            recentRes,
            upcomingRes,
            songFreqRes,
            tourBaseRes,
            tourSongsRes
        ] = await Promise.all([
            // 基本集計
            db.query(`
                SELECT
                    (SELECT COUNT(*)::int FROM lives
                     WHERE setlist_status = 'NORMAL' OR EXISTS (SELECT 1 FROM setlists sl_sub WHERE sl_sub.live_id = lives.id)) as total_lives,
                    (SELECT COUNT(*)::int FROM setlists sl JOIN lives l ON sl.live_id = l.id
                     WHERE l.setlist_status = 'NORMAL' OR EXISTS (SELECT 1 FROM setlists sl_sub WHERE sl_sub.live_id = l.id)) as total_songs_performed
            `),

            // 年別統計
            db.query(`
                SELECT
                    EXTRACT(YEAR FROM l.date)::text as year,
                    COUNT(DISTINCT l.id)::int as live_count,
                    COUNT(sl.id)::int as total_songs,
                    COUNT(DISTINCT sl.song_id)::int as unique_songs
                FROM lives l
                LEFT JOIN setlists sl ON l.id = sl.live_id
                WHERE l.setlist_status = 'NORMAL' OR sl.id IS NOT NULL
                GROUP BY EXTRACT(YEAR FROM l.date)
                ORDER BY year ASC
            `),

            // 直近10件（LatestLive候補）
            // 過去日付 OR 当日でsetlist_status = 'NORMAL' の場合に表示
            db.query(`
                SELECT id, tour_name, title, date::text, venue, type, prefecture, special_note, setlist_status
                FROM lives
                WHERE date::date < $1
                   OR (date::date = $1 AND setlist_status = 'NORMAL')
                ORDER BY date DESC
                LIMIT 10
            `, [today]),

            // 今後のライブ（NextLive候補）
            // 未来日付 OR 当日でNORMAL未確定の場合に表示
            db.query(`
                SELECT id, tour_name, title, date::text, venue, type, prefecture, special_note, setlist_status
                FROM lives
                WHERE date::date > $1
                   OR (date::date = $1 AND (setlist_status IS NULL OR setlist_status != 'NORMAL'))
                ORDER BY date ASC
            `, [today]),

            // 楽曲ごとの演奏回数（全曲・アルバム統計用）
            db.query(`
                SELECT s.id, s.title, s.image_url, COUNT(sl.id)::int as count
                FROM songs s
                JOIN setlists sl ON s.id = sl.song_id
                JOIN lives l ON sl.live_id = l.id
                WHERE l.setlist_status = 'NORMAL' OR EXISTS (SELECT 1 FROM setlists sl_sub WHERE sl_sub.live_id = l.id)
                GROUP BY s.id, s.title, s.image_url
                ORDER BY count DESC
            `),

            // ツアー別基本統計
            db.query(`
                SELECT
                    COALESCE(tour_name, title) as name,
                    COUNT(*)::int as live_count,
                    MIN(date)::text as start_date,
                    MAX(date)::text as end_date,
                    MAX(date)::text as latest_date
                FROM lives
                WHERE (setlist_status = 'NORMAL' OR EXISTS (SELECT 1 FROM setlists sl_sub WHERE sl_sub.live_id = lives.id))
                    AND type NOT IN ('FESTIVAL', 'EVENT')
                    AND (
                        tour_name IS NULL
                        OR (UPPER(tour_name) NOT LIKE '%FES.%' AND UPPER(tour_name) NOT LIKE '%FESTIVAL%')
                    )
                GROUP BY COALESCE(tour_name, title)
                ORDER BY MAX(date) DESC
            `),

            // ツアー内楽曲ランキング
            db.query(`
                SELECT
                    COALESCE(l.tour_name, l.title) as tour_name,
                    s.title as song_title,
                    s.id as song_id,
                    COUNT(sl.id)::int as count,
                    JSON_AGG(
                        JSON_BUILD_OBJECT('id', l.id, 'date', l.date::text, 'venue', l.venue, 'title', l.title)
                        ORDER BY l.date DESC
                    ) as lives
                FROM lives l
                JOIN setlists sl ON l.id = sl.live_id
                JOIN songs s ON sl.song_id = s.id
                WHERE (l.setlist_status = 'NORMAL' OR EXISTS (SELECT 1 FROM setlists sl_sub WHERE sl_sub.live_id = l.id))
                    AND l.type NOT IN ('FESTIVAL', 'EVENT')
                    AND (
                        l.tour_name IS NULL
                        OR (UPPER(l.tour_name) NOT LIKE '%FES.%' AND UPPER(l.tour_name) NOT LIKE '%FESTIVAL%')
                    )
                GROUP BY COALESCE(l.tour_name, l.title), s.title, s.id
            `)
        ]);

        const basic = basicRes.rows[0];
        const totalLives = basic.total_lives;

        // 全楽曲頻度マップ（アルバム統計用）と上位50件ランキング
        const songFrequencyMap = {};
        songFreqRes.rows.forEach(s => { songFrequencyMap[s.title] = s.count; });

        const globalSongRanking = songFreqRes.rows.slice(0, 50).map(s => ({
            id: s.id,
            title: s.title,
            image_url: s.image_url,
            count: s.count,
            percentage: ((s.count / totalLives) * 100).toFixed(1)
        }));

        // ツアー内楽曲マップ構築
        const tourLiveCountMap = {};
        tourBaseRes.rows.forEach(t => { tourLiveCountMap[t.name] = t.live_count; });

        const tourSongMap = {};
        tourSongsRes.rows.forEach(row => {
            const tourName = row.tour_name;
            if (!tourSongMap[tourName]) tourSongMap[tourName] = [];
            const liveCount = tourLiveCountMap[tourName] || 1;
            tourSongMap[tourName].push({
                title: row.song_title,
                count: row.count,
                lives: row.lives.map(l => ({ ...l, date: formatDate(l.date) })),
                percentage: ((row.count / liveCount) * 100).toFixed(1)
            });
        });

        // ツアーランキング構築
        const tourRanking = tourBaseRes.rows.map(tour => ({
            name: tour.name,
            liveCount: tour.live_count,
            totalSongs: (tourSongMap[tour.name] || []).reduce((sum, s) => sum + s.count, 0),
            songRanking: (tourSongMap[tour.name] || []).sort((a, b) => b.count - a.count),
            startDate: formatDate(tour.start_date),
            endDate: formatDate(tour.end_date),
            latestDate: formatDate(tour.latest_date)
        }));

        res.json({
            totalLives,
            totalSongsPerformed: basic.total_songs_performed,
            yearlyDetailedStats: yearlyRes.rows.map(r => ({
                year: r.year,
                liveCount: r.live_count,
                totalSongs: r.total_songs,
                uniqueSongs: r.unique_songs,
                avgSongs: (r.total_songs / r.live_count).toFixed(1)
            })),
            recentLives: recentRes.rows.map(r => ({
                ...r,
                venue: normalizeVenueName(r.venue)
            })),
            upcomingLives: upcomingRes.rows.map(r => ({
                ...r,
                date: formatDate(r.date),
                venue: normalizeVenueName(r.venue)
            })),
            globalSongRanking,
            tourRanking,
            currentTour: tourRanking[0] || null,
            songFrequencyMap
        });
    } catch (err) {
        console.error('[/api/stats] Error:', err.message);
        console.error(err.stack);
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
});

module.exports = router;
