const axios = require('axios');
const db = require('../db');
const { encrypt, decrypt } = require('../utils/encryption');

/**
 * Spotify APIとの通信およびデータ選別を担当するサービス
 */
class SpotifyService {
    constructor(userId) {
        this.userId = userId;
    }

    /**
     * Spotifyのアクセストークンを取得する。
     * 期限切れの場合はリフレッシュトークンを使用して自動更新する。
     */
    async getAccessToken() {
        const res = await db.query(
            'SELECT access_token, refresh_token_encrypted, expires_at FROM user_spotify_tokens WHERE user_id = $1',
            [this.userId]
        );

        if (res.rows.length === 0) {
            throw new Error('Spotify integration not linked for this user');
        }

        const { access_token, refresh_token_encrypted, expires_at } = res.rows[0];

        // 期限切れチェック（60秒のバッファ）
        if (new Date(expires_at).getTime() > Date.now() + 60000) {
            return decrypt(access_token);
        }

        // リフレッシュ実行
        try {
            const refreshToken = decrypt(refresh_token_encrypted);
            return await this.refreshAccessToken(refreshToken);
        } catch (err) {
            console.error('[Spotify] Token refresh failed:', err.message);
            // リフレッシュトークンが無効な場合、連携を解除してユーザーに再連携を促す
            await db.query('DELETE FROM user_spotify_tokens WHERE user_id = $1', [this.userId]);
            throw new Error('Spotify session expired. Please re-link your account.');
        }
    }

    /**
     * リフレッシュトークンを使用して新しいアクセストークンを取得・保存する
     */
    async refreshAccessToken(refreshToken) {
        const params = new URLSearchParams();
        params.append('grant_type', 'refresh_token');
        params.append('refresh_token', refreshToken);

        const authHeader = Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64');

        const res = await axios.post('https://accounts.spotify.com/api/token', params, {
            headers: {
                'Authorization': `Basic ${authHeader}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const { access_token, expires_in } = res.data;
        const expiresAt = new Date(Date.now() + expires_in * 1000);

        // 新しいアクセストークンを暗号化して保存
        await db.query(
            `UPDATE user_spotify_tokens
             SET access_token = $1, expires_at = $2, updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $3`,
            [encrypt(access_token), expiresAt, this.userId]
        );

        return access_token;
    }

    /**
     * 楽曲を検索し、最適なマッチを選択して返す
     * @param {string} title 
     */
    async searchTrack(title) {
        const token = await this.getAccessToken();
        const query = `track:${title} artist:UVERworld`;
        
        const res = await this.request('https://api.spotify.com/v1/search', 'GET', {
            q: query,
            type: 'track',
            market: 'JP',
            limit: 10
        }, token);

        const tracks = res.tracks.items;
        if (tracks.length === 0) return null;

        // 選別ロジック
        const normalizedTarget = title.toLowerCase().replace(/\s+/g, '');

        const scoredTracks = tracks.map(track => {
            let score = 0;

            // 1. アーティスト完全一致 (UVERworld)
            const isUver = track.artists.some(a => a.name === 'UVERworld');
            if (isUver) score += 1000;

            // 2. 曲名完全一致（正規化後）
            const normalizedName = track.name.toLowerCase().replace(/\s+/g, '');
            if (normalizedName === normalizedTarget) {
                score += 500;
            } else if (normalizedName.includes(normalizedTarget) || normalizedTarget.includes(normalizedName)) {
                score += 100;
            }

            // 3. ライブ版・リミックスの除外（ペナルティ）
            const nameLower = track.name.toLowerCase();
            if (nameLower.includes('live') || nameLower.includes('remix') || nameLower.includes('edit') || nameLower.includes('instrumental')) {
                score -= 300;
            }

            // 4. 人気度（微調整）
            score += (track.popularity || 0);

            return { track, score };
        });

        // スコアの高い順にソートして1位を返す
        scoredTracks.sort((a, b) => b.score - a.score);
        return scoredTracks[0].track;
    }

    /**
     * 新規プライリストを作成する
     */
    async createPlaylist(name, description) {
        const token = await this.getAccessToken();
        const me = await this.request('https://api.spotify.com/v1/me', 'GET', null, token);
        
        const res = await this.request(`https://api.spotify.com/v1/users/${me.id}/playlists`, 'POST', {
            name,
            description,
            public: false // デフォルトは非公開
        }, token);

        return res;
    }

    /**
     * プライリストに楽曲を一括追加する（チャンク処理・バックオフ対応）
     */
    async addTracksToPlaylist(playlistId, trackUris) {
        const token = await this.getAccessToken();
        
        // Spotify APIは1リクエスト最大100曲まで
        const chunks = [];
        for (let i = 0; i < trackUris.length; i += 100) {
            chunks.push(trackUris.slice(i, i + 100));
        }

        const results = [];
        for (const chunk of chunks) {
            const res = await this.request(
                `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
                'POST',
                { uris: chunk },
                token
            );
            results.push(res);
        }

        return results;
    }

    /**
     * 共通リクエストメソッド（Retry-After対応のExponential Backoff付き）
     */
    async request(url, method, params, token, retryCount = 0) {
        try {
            const config = {
                url,
                method,
                headers: { 'Authorization': `Bearer ${token}` }
            };
            if (method === 'GET') config.params = params;
            else config.data = params;

            const res = await axios(config);
            return res.data;
        } catch (err) {
            // 429 Rate Limit
            if (err.response?.status === 429 && retryCount < 3) {
                const retryAfter = parseInt(err.response.headers['retry-after'], 10) || Math.pow(2, retryCount);
                console.warn(`[Spotify] Rate limited. Retrying after ${retryAfter}s...`);
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                return this.request(url, method, params, token, retryCount + 1);
            }
            throw err;
        }
    }
}

module.exports = SpotifyService;
