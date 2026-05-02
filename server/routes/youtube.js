const router = require('express').Router();
const { authorize } = require('../middleware/authorization');
const YoutubeService = require('../services/youtubeService');
const db = require('../db');
const { encrypt } = require('../utils/encryption');
const { google } = require('googleapis');

/**
 * YouTube (Google) 認証URL取得
 */
router.get('/auth-url', authorize, (req, res) => {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );

    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline', // リフレッシュトークンを取得するために必須
        scope: ['https://www.googleapis.com/auth/youtube'],
        state: String(req.user.id),
        prompt: 'consent' // 常にリフレッシュトークンを返すように強制
    });

    res.json({ url });
});

/**
 * YouTube OAuth コールバック
 */
router.get('/callback', async (req, res) => {
    const { code, state } = req.query; // state に userId を渡している
    
    if (!code) {
        return res.status(400).send('Authorization code is missing');
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
        if (refresh_token) {
            await db.query(
                `INSERT INTO user_google_tokens (user_id, access_token, refresh_token_encrypted, expires_at)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (user_id) DO UPDATE SET
                    access_token = EXCLUDED.access_token,
                    refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
                    expires_at = EXCLUDED.expires_at,
                    updated_at = CURRENT_TIMESTAMP`,
                [state, access_token, encrypt(refresh_token), expiresAt]
            );
        } else {
            await db.query(
                `UPDATE user_google_tokens SET
                    access_token = $1,
                    expires_at = $2,
                    updated_at = CURRENT_TIMESTAMP
                 WHERE user_id = $3`,
                [access_token, expiresAt, state]
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
        const result = await db.query(
            'SELECT updated_at FROM user_google_tokens WHERE user_id = $1',
            [req.user.id]
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
    const userId = req.user.id;

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
        // クォータ節約とタイムアウト防止のため、エラーが発生しても続行する
        const addedIds = [];
        for (const vid of videoIds) {
            try {
                await youtube.addVideoToPlaylist(playlist.id, vid);
                addedIds.push(vid);
            } catch (addErr) {
                console.error(`[YouTube] Failed to add video ${vid} to playlist:`, addErr.message);
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
            missing: missingSongs
        });

    } catch (err) {
        console.error('[YouTube] Create Playlist Error:', err.message);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
