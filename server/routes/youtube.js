const router = require('express').Router();
const { authorize } = require('../middleware/authorization');
const YoutubeService = require('../services/youtubeService');
const db = require('../db');
const { encrypt, signState, verifyState } = require('../utils/encryption');
const { google } = require('googleapis');

/**
 * YouTube (Google) 認証URL取得
 */
router.get('/auth-url', authorize, (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
        console.error('[YouTube] GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REDIRECT_URI is not set');
        return res.status(500).json({ message: 'YouTube API configuration missing' });
    }

    if (!process.env.ENCRYPTION_KEY) {
        console.error('[YouTube] ENCRYPTION_KEY is not set');
        return res.status(500).json({ message: 'Server configuration error' });
    }

    try {
        const userId = req.user.user_id || req.user.id;
        if (!userId || userId === 'undefined') {
            console.error('[AUTH] signState called with missing or invalid userId:', userId);
            return res.status(401).json({ message: 'User identification failed' });
        }

        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
        const url = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/youtube'],
            state: signState(userId),
            prompt: 'consent'
        });
        res.json({ url });
    } catch (err) {
        console.error('[YouTube] auth-url error:', err.message);
        res.status(500).json({ message: 'Failed to generate auth URL' });
    }
});

/**
 * YouTube OAuth コールバック
 */
router.get('/callback', async (req, res) => {
    const { code, state } = req.query;

    if (!code) {
        return res.status(400).send('Authorization code is missing');
    }

    let userId;
    try {
        userId = verifyState(state);
    } catch (e) {
        return res.status(400).send('Invalid state parameter');
    }

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );

    try {
        const { tokens } = await oauth2Client.getToken(code);
        const { access_token, refresh_token, expiry_date } = tokens;
        const expiresAt = new Date(expiry_date);

        // トークンを暗号化してDBに保存
        // Googleは初回認証時のみ refresh_token を返すため、
        // もし2回目以降で取得できなかった場合は既存のものを維持するようにする
        // access_token・refresh_token ともに暗号化して保存
        if (refresh_token) {
            await db.query(
                `INSERT INTO user_google_tokens (user_id, access_token, refresh_token_encrypted, expires_at)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (user_id) DO UPDATE SET
                    access_token = EXCLUDED.access_token,
                    refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
                    expires_at = EXCLUDED.expires_at,
                    updated_at = CURRENT_TIMESTAMP`,
                [userId, encrypt(access_token), encrypt(refresh_token), expiresAt]
            );
        } else {
            await db.query(
                `UPDATE user_google_tokens SET
                    access_token = $1,
                    expires_at = $2,
                    updated_at = CURRENT_TIMESTAMP
                 WHERE user_id = $3`,
                [encrypt(access_token), expiresAt, userId]
            );
        }

        res.send(`
            <html>
                <head><title>Success</title></head>
                <body style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif;">
                    <h1>YouTube連携が完了しました！</h1>
                    <p>このウィンドウを閉じて、アプリに戻ってください。</p>
                    <script>setTimeout(() => window.close(), 2000)</script>
                </body>
            </html>
        `);
    } catch (err) {
        console.error('[YouTube] Callback Error:', err.message);
        res.status(500).send('YouTube連携中にエラーが発生しました。再度お試しください。');
    }
});

/**
 * 連携状態の確認
 */
router.get('/status', authorize, async (req, res) => {
    try {
        const userId = req.user.user_id || req.user.id;
        const result = await db.query(
            'SELECT updated_at FROM user_google_tokens WHERE user_id = $1',
            [userId]
        );
        res.json({ linked: result.rows.length > 0 });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/**
 * プレイリスト作成実行
 */
router.post('/create-playlist', authorize, async (req, res) => {
    const { liveId } = req.body;
    const userId = req.user.user_id || req.user.id;

    if (!liveId) return res.status(400).json({ message: 'liveId is required' });

    try {
        // 1. 10秒以内の連打防止
        const recentRes = await db.query(
            `SELECT id FROM playlist_history 
             WHERE user_id = $1 AND live_id = $2 AND platform = 'youtube'
             AND created_at > NOW() - INTERVAL '10 seconds'`,
            [userId, liveId]
        );
        if (recentRes.rows.length > 0) {
            return res.status(429).json({ message: '連打防止のため、10秒ほど空けてから再度お試しください。' });
        }

        // 2. ライブ・セトリ詳細の取得
        const liveRes = await db.query('SELECT * FROM lives WHERE id = $1', [liveId]);
        if (liveRes.rows.length === 0) return res.status(404).json({ message: 'ライブが見つかりません' });
        const live = liveRes.rows[0];

        const setlistRes = await db.query(
            `SELECT s.id, s.title, s.yt_video_id
             FROM setlists sl
             JOIN songs s ON s.id = sl.song_id
             WHERE sl.live_id = $1
             ORDER BY sl.position`,
            [liveId]
        );
        const setlist = setlistRes.rows;
        if (setlist.length === 0) return res.status(400).json({ message: 'セットリストがまだ登録されていません。' });

        const youtube = new YoutubeService(userId);
        const videoIds = [];
        const videoIdToTitle = {}; // 動画追加失敗時にタイトルを特定するため
        const missingSongs = [];

        // 3. 動画IDの解決 (DB優先 -> YouTube検索)
        for (const song of setlist) {
            let videoId = song.yt_video_id;

            if (!videoId) {
                try {
                    const track = await youtube.searchTrack(song.title);
                    if (track) {
                        videoId = track.id;
                        await db.query('UPDATE songs SET yt_video_id = $1 WHERE id = $2', [videoId, song.id]);
                    }
                } catch (searchErr) {
                    console.warn(`[YouTube] Search error for "${song.title}":`, searchErr.message);
                }
            }

            if (videoId) {
                videoIds.push(videoId);
                videoIdToTitle[videoId] = song.title;
            } else {
                missingSongs.push(song.title);
            }
        }

        if (videoIds.length === 0) {
            return res.status(400).json({ message: 'YouTubeで見つかる動画がありませんでした。' });
        }

        // 4. プレイリスト作成
        const dateStr = new Date(live.date).toLocaleDateString('ja-JP', {
            year: 'numeric', month: '2-digit', day: '2-digit'
        }).replace(/\//g, '/');
        
        const playlistName = `UVERworld - ${dateStr} ${live.venue} セトリ`;
        const description = `Generated by UVER Setlist App | Tour: ${live.tour_name || 'Special Live'}`;

        const playlist = await youtube.createPlaylist(playlistName, description);
        
        // 5. 動画追加 (YouTube APIは1件ずつ追加する必要がある)
        const addedIds = [];
        const failedToAddSongs = [];
        for (const vid of videoIds) {
            try {
                await youtube.addVideoToPlaylist(playlist.id, vid);
                addedIds.push(vid);
            } catch (addErr) {
                console.error(`[YouTube] Failed to add video ${vid} to playlist:`, addErr.message);
                failedToAddSongs.push(videoIdToTitle[vid] || vid);
            }
        }

        // 6. 履歴保存
        await db.query(
            "INSERT INTO playlist_history (user_id, live_id, playlist_id, platform) VALUES ($1, $2, $3, 'youtube')",
            [userId, liveId, playlist.id]
        );

        res.json({
            success: true,
            playlistUrl: `https://www.youtube.com/playlist?list=${playlist.id}`,
            total: setlist.length,
            added: addedIds.length,
            missing: [...missingSongs, ...failedToAddSongs]
        });

    } catch (err) {
        console.error('[YouTube] Create Playlist Error:', err.message);
        res.status(500).json({ message: err.message });
    }
});

/**
 * プレイリスト作成履歴の取得（ログインユーザー × ライブ）
 */
router.get('/history/:liveId', authorize, async (req, res) => {
    const { liveId } = req.params;
    try {
        const userId = req.user.user_id || req.user.id;
        const result = await db.query(
            `SELECT playlist_id, created_at FROM playlist_history
             WHERE user_id = $1 AND live_id = $2 AND platform = 'youtube'
             ORDER BY created_at DESC LIMIT 5`,
            [userId, liveId]
        );
        res.json(result.rows.map(r => ({
            playlistUrl: `https://www.youtube.com/playlist?list=${r.playlist_id}`,
            createdAt: r.created_at
        })));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/**
 * 楽曲のオートマッピング (単一)
 */
router.post('/auto-map-song', authorize, async (req, res) => {
    const { songId } = req.body;
    const userId = req.user.user_id || req.user.id;

    try {
        const songRes = await db.query('SELECT title FROM songs WHERE id = $1', [songId]);
        if (songRes.rows.length === 0) return res.status(404).json({ message: 'Song not found' });
        const songTitle = songRes.rows[0].title;

        const youtube = new YoutubeService(userId);
        const track = await youtube.searchTrack(songTitle);

        if (track) {
            await db.query('UPDATE songs SET yt_video_id = $1 WHERE id = $2', [track.id, songId]);
            return res.json({ success: true, video: track });
        }
        res.json({ success: false, message: 'No match found' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/**
 * 楽曲のオートマッピング (一括)
 */
router.post('/auto-map-batch', authorize, async (req, res) => {
    const { songIds } = req.body; // Array of IDs
    const userId = req.user.user_id || req.user.id;

    if (!Array.isArray(songIds)) return res.status(400).json({ message: 'songIds must be an array' });

    try {
        const youtube = new YoutubeService(userId);
        const results = { success: 0, failed: 0, skipped: 0 };

        for (const id of songIds) {
            const songRes = await db.query('SELECT title, yt_video_id FROM songs WHERE id = $1', [id]);
            if (songRes.rows.length === 0) {
                results.failed++;
                continue;
            }
            if (songRes.rows[0].yt_video_id) {
                results.skipped++;
                continue;
            }

            try {
                const track = await youtube.searchTrack(songRes.rows[0].title);
                if (track) {
                    await db.query('UPDATE songs SET yt_video_id = $1 WHERE id = $2', [track.id, id]);
                    results.success++;
                } else {
                    results.failed++;
                }
            } catch (err) {
                console.error(`[YouTube Bulk] Error for song ID ${id}:`, err.message);
                results.failed++;
            }
            // Rate limiting (Search API is expensive, but for admin it's fine with small delay)
            await new Promise(r => setTimeout(r, 200));
        }

        res.json({ success: true, results });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
