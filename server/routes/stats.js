const router = require('express').Router();
const db = require('../db');
const { normalizeVenueName } = require('../utils/songTranslations');

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr.split('T')[0].replace(/-/g, '/'));
    return d.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.');
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
                    (SELECT COUNT(*)::int FROM lives WHERE date::date <= $1) as total_lives,
                    (SELECT COUNT(*)::int FROM setlists sl JOIN lives l ON sl.live_id = l.id WHERE l.date::date <= $1) as total_songs_performed
            `, [today]),

            // 年別統計
            db.query(`
                SELECT
                    EXTRACT(YEAR FROM l.date)::text as year,
                    COUNT(DISTINCT l.id)::int as live_count,
                    COUNT(sl.id)::int as total_songs,
                    COUNT(DISTINCT sl.song_id)::int as unique_songs
                FROM lives l
                LEFT JOIN setlists sl ON l.id = sl.live_id
                WHERE l.date::date <= $1
                GROUP BY EXTRACT(YEAR FROM l.date)
                ORDER BY year ASC
            `, [today]),

            // 直近10件
            db.query(`
                SELECT id, tour_name, title, date::text, venue, type, prefecture, special_note
                FROM lives
                WHERE date::date <= $1
                ORDER BY date DESC
                LIMIT 10
            `, [today]),

            // 今後のライブ
            db.query(`
                SELECT id, tour_name, title, date::text, venue, type, prefecture, special_note
                FROM lives
                WHERE date::date > $1
                ORDER BY date ASC
            `, [today]),

            // 楽曲ごとの演奏回数（全曲・アルバム統計用）
            db.query(`
                SELECT s.id, s.title, s.image_url, COUNT(sl.id)::int as count
                FROM songs s
                JOIN setlists sl ON s.id = sl.song_id
                JOIN lives l ON sl.live_id = l.id
                WHERE l.date::date <= $1
                GROUP BY s.id, s.title, s.image_url
                ORDER BY count DESC
            `, [today]),

            // ツアー別基本統計
            db.query(`
                SELECT
                    COALESCE(tour_name, title) as name,
                    COUNT(*)::int as live_count,
                    MIN(date)::text as start_date,
                    MAX(date)::text as end_date,
                    MAX(date)::text as latest_date
                FROM lives
                WHERE date::date <= $1
                    AND type NOT IN ('FESTIVAL', 'EVENT')
                    AND (
                        tour_name IS NULL
                        OR (UPPER(tour_name) NOT LIKE '%FES.%' AND UPPER(tour_name) NOT LIKE '%FESTIVAL%')
                    )
                GROUP BY COALESCE(tour_name, title)
                ORDER BY MAX(date) DESC
            `, [today]),

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
                WHERE l.date::date <= $1
                    AND l.type NOT IN ('FESTIVAL', 'EVENT')
                    AND (
                        l.tour_name IS NULL
                        OR (UPPER(l.tour_name) NOT LIKE '%FES.%' AND UPPER(l.tour_name) NOT LIKE '%FESTIVAL%')
                    )
                GROUP BY COALESCE(l.tour_name, l.title), s.title, s.id
            `, [today])
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
        console.error('Stats API error:', err);
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
});

module.exports = router;
