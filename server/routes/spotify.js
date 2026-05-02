const router = require('express').Router();
const { authorize } = require('../middleware/authorization');
const SpotifyService = require('../services/spotifyService');
const db = require('../db');
const { encrypt } = require('../utils/encryption');
const axios = require('axios');

/**
 * Spotify認証URL取得
 */
router.get('/auth-url', authorize, (req, res) => {
    const scopes = 'playlist-modify-public playlist-modify-private';
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    
    if (!clientId || !redirectUri) {
        return res.status(500).json({ message: 'Spotify API configuration missing' });
    }

    const url = `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${req.user.id}`;
    res.json({ url });
});

/**
 * Spotify OAuth コールバック
 */
router.get('/callback', async (req, res) => {
    const { code, state } = req.query; // state に userId を渡している
    
    if (!code) {
        return res.status(400).send('Authorization code is missing');
    }

    const authHeader = Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString('base64');

    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', process.env.SPOTIFY_REDIRECT_URI);

    try {
        const response = await axios.post('https://accounts.spotify.com/api/token', params, {
            headers: {
                'Authorization': `Basic ${authHeader}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const { access_token, refresh_token, expires_in } = response.data;
        const expiresAt = new Date(Date.now() + expires_in * 1000);

        // トークンを暗号化してDBに保存
        await db.query(
            `INSERT INTO user_spotify_tokens (user_id, access_token, refresh_token_encrypted, expires_at)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id) DO UPDATE SET
                access_token = EXCLUDED.access_token,
                refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
                expires_at = EXCLUDED.expires_at,
                updated_at = CURRENT_TIMESTAMP`,
            [state, access_token, encrypt(refresh_token), expiresAt]
        );

        // 完了画面を表示して閉じる
        res.send(`
            <html>
                <head><title>Success</title></head>
                <body style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif;">
                    <h1>Spotify連携が完了しました！</h1>
                    <p>このウィンドウを閉じて、アプリに戻ってください。</p>
                    <script>setTimeout(() => window.close(), 2000)</script>
                </body>
            </html>
        `);
    } catch (err) {
        console.error('[Spotify] Callback Error:', err.response?.data || err.message);
        res.status(500).send('Spotify連携中にエラーが発生しました。再度お試しください。');
    }
});

/**
 * 連携状態の確認
 */
router.get('/status', authorize, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT updated_at FROM user_spotify_tokens WHERE user_id = $1',
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
        // 1. 10秒以内の連打防止（同一ユーザー・同一ライブ）
        const recentRes = await db.query(
            `SELECT id FROM playlist_history 
             WHERE user_id = $1 AND live_id = $2 
             AND created_at > NOW() - INTERVAL '10 seconds'`,
            [userId, liveId]
        );
        if (recentRes.rows.length > 0) {
            return res.status(429).json({ message: '連打防止のため、10秒ほど空けてから再度お試しください。' });
        }

        // 2. ライブ詳細の取得
        const liveRes = await db.query('SELECT * FROM lives WHERE id = $1', [liveId]);
        if (liveRes.rows.length === 0) return res.status(404).json({ message: 'ライブが見つかりません' });
        const live = liveRes.rows[0];

        // 3. セトリ楽曲の取得
        const setlistRes = await db.query(
            `SELECT s.id, s.title, s.spotify_track_id
             FROM setlists sl
             JOIN songs s ON s.id = sl.song_id
             WHERE sl.live_id = $1
             ORDER BY sl.position`,
            [liveId]
        );
        const setlist = setlistRes.rows;
        if (setlist.length === 0) return res.status(400).json({ message: 'セットリストがまだ登録されていません。' });

        const spotify = new SpotifyService(userId);
        const trackUris = [];
        const missingSongs = [];

        // 4. Track ID の解決（DB優先 -> Spotify検索）
        for (const song of setlist) {
            let trackId = song.spotify_track_id;

            if (!trackId) {
                // オートマッピング試行
                try {
                    const track = await spotify.searchTrack(song.title);
                    if (track) {
                        trackId = track.id;
                        // 次回以降のためにDB更新
                        await db.query('UPDATE songs SET spotify_track_id = $1 WHERE id = $2', [trackId, song.id]);
                    }
                } catch (searchErr) {
                    console.warn(`[Spotify] Failed to search for "${song.title}":`, searchErr.message);
                }
            }

            if (trackId) {
                trackUris.push(`spotify:track:${trackId}`);
            } else {
                missingSongs.push(song.title);
            }
        }

        if (trackUris.length === 0) {
            return res.status(400).json({ message: 'Spotifyで見つかる楽曲がありませんでした。' });
        }

        // 5. プレイリスト作成
        const dateStr = new Date(live.date).toLocaleDateString('ja-JP', {
            year: 'numeric', month: '2-digit', day: '2-digit'
        }).replace(/\//g, '/');
        
        const playlistName = `UVERworld - ${dateStr} ${live.venue} セトリ`;
        const description = `Generated by UVER Setlist App | Tour: ${live.tour_name || 'Special Live'}`;

        const playlist = await spotify.createPlaylist(playlistName, description);
        
        // 6. 楽曲追加
        await spotify.addTracksToPlaylist(playlist.id, trackUris);

        // 7. 履歴保存
        await db.query(
            'INSERT INTO playlist_history (user_id, live_id, playlist_id) VALUES ($1, $2, $3)',
            [userId, liveId, playlist.id]
        );

        res.json({
            success: true,
            playlistUrl: playlist.external_urls.spotify,
            total: setlist.length,
            added: trackUris.length,
            missing: missingSongs
        });

    } catch (err) {
        console.error('[Spotify] Create Playlist Error:', err.message);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
