const { google } = require('googleapis');
const db = require('../db');
const { decrypt } = require('../utils/encryption');

/**
 * YouTube Data API v3を使用したプレイリスト操作および楽曲検索サービス
 */
class YoutubeService {
    constructor(userId) {
        this.userId = userId;
        this.oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );
    }

    /**
     * 認証済みYouTubeクライアントを取得する
     */
    async getAuthenticatedClient() {
        const res = await db.query(
            'SELECT access_token, refresh_token_encrypted, expires_at FROM user_google_tokens WHERE user_id = $1',
            [this.userId]
        );

        if (res.rows.length === 0) {
            throw new Error('YouTube Music integration not linked for this user');
        }

        const { access_token, refresh_token_encrypted, expires_at } = res.rows[0];
        const refreshToken = decrypt(refresh_token_encrypted);

        this.oauth2Client.setCredentials({
            access_token,
            refresh_token: refreshToken,
            expiry_date: new Date(expires_at).getTime()
        });

        // トークンがリフレッシュされた際の自動更新
        this.oauth2Client.on('tokens', async (tokens) => {
            if (tokens.access_token) {
                const newExpiresAt = new Date(tokens.expiry_date || (Date.now() + 3600 * 1000));
                await db.query(
                    'UPDATE user_google_tokens SET access_token = $1, expires_at = $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $3',
                    [tokens.access_token, newExpiresAt, this.userId]
                );
            }
        });

        return google.youtube({ version: 'v3', auth: this.oauth2Client });
    }

    /**
     * 楽曲を検索し、最適な動画IDを返す
     * @param {string} title 
     */
    async searchTrack(title) {
        const youtube = await this.getAuthenticatedClient();
        
        // 検索クエリ: 公式Topicを優先するため "topic" を付与
        const query = `UVERworld ${title} topic`;
        
        const res = await youtube.search.list({
            q: query,
            part: 'snippet',
            type: 'video',
            videoCategoryId: '10', // Music
            regionCode: 'JP',
            maxResults: 5
        });

        const items = res.data.items;
        if (!items || items.length === 0) return null;

        const normalizedTarget = title.toLowerCase().replace(/\s+/g, '');

        // 選別スコアリング
        const scoredItems = items.map(item => {
            let score = 0;
            const snippet = item.snippet;
            const videoTitle = snippet.title;
            const channelTitle = snippet.channelTitle;

            // 1. "Topic" チャンネル (公式自動生成) は最優先
            if (channelTitle.toLowerCase().includes('topic')) {
                score += 1000;
            }

            // 2. タイトルのマッチング
            const normalizedVideoTitle = videoTitle.toLowerCase().replace(/\s+/g, '');
            if (normalizedVideoTitle.includes(normalizedTarget)) {
                score += 500;
            }
            if (normalizedVideoTitle.includes('uverworld')) {
                score += 200;
            }

            // 3. UVERworld 公式チャンネル
            if (channelTitle.includes('UVERworld')) {
                score += 300;
            }

            return { item, score };
        });

        // スコア順にソート
        scoredItems.sort((a, b) => b.score - a.score);
        const bestItem = scoredItems[0].item;

        return {
            id: bestItem.id.videoId,
            title: bestItem.snippet.title,
            channelTitle: bestItem.snippet.channelTitle
        };
    }

    /**
     * プライリストを作成する
     */
    async createPlaylist(title, description) {
        const youtube = await this.getAuthenticatedClient();
        
        const res = await youtube.playlists.insert({
            part: 'snippet,status',
            requestBody: {
                snippet: {
                    title: title,
                    description: description,
                },
                status: {
                    privacyStatus: 'private'
                }
            }
        });

        return res.data;
    }

    /**
     * プライリストに動画を追加する (逐次追加が必要)
     */
    async addVideoToPlaylist(playlistId, videoId) {
        const youtube = await this.getAuthenticatedClient();
        
        const res = await youtube.playlistItems.insert({
            part: 'snippet',
            requestBody: {
                snippet: {
                    playlistId: playlistId,
                    resourceId: {
                        kind: 'youtube#video',
                        videoId: videoId
                    }
                }
            }
        });

        return res.data;
    }
}

module.exports = YoutubeService;
