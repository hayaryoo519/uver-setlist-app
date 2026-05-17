const router = require('express').Router();
const db = require('../db');
const { normalizeVenueName } = require('../utils/songTranslations');
const { authorize, adminCheck } = require('../middleware/authorization');

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    // node:20-slim は ICU データが限定的なため toLocaleDateString は使わない
    const [year, month, day] = dateStr.split('T')[0].split(' ')[0].split('-');
    if (!year || !month || !day) return dateStr;
    return `${year}.${month}.${day}`;
};

router.get('/', async (req, res, next) => {
    if (req.query.admin === 'true') {
        return next();
    }
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
                lives: row.lives,
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

// 管理者向けKPI統計（/api/stats?admin=true でアクセスされる）
router.get('/', authorize, adminCheck, async (req, res) => {
    try {
        const queryWithFallback = async (queryStr, fallbackRows) => {
            try {
                return await db.query(queryStr);
            } catch (err) {
                console.error(`[STATS/ADMIN] Query failed:`, err.message);
                return { rows: fallbackRows };
            }
        };

        const [
            userStatsRes,
            predictionStatsRes,
            attendanceStatsRes,
            activeUsersRes,
            correctionStatsRes,
            dailyRegistrationsRes,
            dailyPredictionsRes,
        ] = await Promise.all([
            // ユーザー統計
            queryWithFallback(`
                SELECT
                    COUNT(*)::int                                                          AS total_users,
                    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS new_users_30d,
                    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int  AS new_users_7d,
                    COUNT(*) FILTER (WHERE is_public = true)::int                         AS public_users
                FROM users
                WHERE deleted_at IS NULL
            `, [{ total_users: 0, new_users_30d: 0, new_users_7d: 0, public_users: 0 }]),

            // 予想統計
            queryWithFallback(`
                SELECT
                    COUNT(*)::int                                                          AS total_predictions,
                    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS new_predictions_30d,
                    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int  AS new_predictions_7d,
                    COUNT(DISTINCT user_id)::int                                           AS users_with_predictions
                FROM predictions
            `, [{ total_predictions: 0, new_predictions_30d: 0, new_predictions_7d: 0, users_with_predictions: 0 }]),

            // 参戦記録統計
            queryWithFallback(`
                SELECT
                    COUNT(*)::int                                                          AS total_attendance,
                    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS new_attendance_30d,
                    COUNT(DISTINCT user_id)::int                                           AS users_with_attendance
                FROM attendance
            `, [{ total_attendance: 0, new_attendance_30d: 0, users_with_attendance: 0 }]),

            // アクティブユーザー（ログイン成功ベース）
            queryWithFallback(`
                SELECT
                    COUNT(DISTINCT user_email) FILTER (WHERE timestamp >= NOW() - INTERVAL '7 days')::int  AS active_7d,
                    COUNT(DISTINCT user_email) FILTER (WHERE timestamp >= NOW() - INTERVAL '30 days')::int AS active_30d
                FROM security_logs
                WHERE event_type = 'login_success'
            `, [{ active_7d: 0, active_30d: 0 }]),

            // 修正依頼統計
            queryWithFallback(`
                SELECT
                    COUNT(*)::int                                              AS total_corrections,
                    COUNT(*) FILTER (WHERE status = 'pending')::int           AS pending_corrections,
                    COUNT(*) FILTER (WHERE status = 'resolved')::int          AS resolved_corrections
                FROM corrections
            `, [{ total_corrections: 0, pending_corrections: 0, resolved_corrections: 0 }]),

            // 直近30日の日別新規ユーザー数
            queryWithFallback(`
                SELECT
                    DATE(created_at)::text AS date,
                    COUNT(*)::int          AS count
                FROM users
                WHERE created_at >= NOW() - INTERVAL '30 days'
                  AND deleted_at IS NULL
                GROUP BY DATE(created_at)
                ORDER BY date ASC
            `, []),

            // 直近30日の日別予想投稿数
            queryWithFallback(`
                SELECT
                    DATE(created_at)::text AS date,
                    COUNT(*)::int          AS count
                FROM predictions
                WHERE created_at >= NOW() - INTERVAL '30 days'
                GROUP BY DATE(created_at)
                ORDER BY date ASC
            `, [])
        ]);

        res.json({
            users:        { ...userStatsRes.rows[0] },
            predictions:  { ...predictionStatsRes.rows[0] },
            attendance:   { ...attendanceStatsRes.rows[0] },
            activeUsers:  { ...activeUsersRes.rows[0] },
            corrections:  { ...correctionStatsRes.rows[0] },
            dailyRegistrations: dailyRegistrationsRes.rows,
            dailyPredictions:   dailyPredictionsRes.rows,
        });
    } catch (err) {
        console.error('[/api/stats/admin] Error:', err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
