/**
 * iTunes API (Apple Music) 連携ルート
 * アルバム・シングルのジャケット画像を取得する
 */
const router = require('express').Router();
const db = require('../db');

/**
 * iTunes Search APIで楽曲を検索し、アルバム画像URLを返す
 */
async function searchITunesTrack(songTitle) {
    // 検索クエリ: "UVERworld 曲名"
    const query = encodeURIComponent(`UVERworld ${songTitle}`);
    
    // iTunes API呼び出し (country=jp, entity=song)
    const url = `https://itunes.apple.com/search?term=${query}&country=jp&entity=song&limit=5`;
    
    const response = await fetch(url);

    if (!response.ok) {
        console.error(`[iTunes] 検索エラー: ${response.status} for "${songTitle}"`);
        return null;
    }

    const data = await response.json();
    const tracks = data.results || [];

    if (tracks.length === 0) {
        console.log(`[iTunes] "${songTitle}" の検索結果なし`);
        return null;
    }

    // UVERworld のトラックを優先して選択（iTunesは基本正確ですが念のため）
    const uverTrack = tracks.find(t =>
        t.artistName.toLowerCase().includes('uverworld')
    ) || tracks[0];

    // iTunesの画像URLは末尾に 100x100bb.jpg のようなサイズ指定がある。
    // 高画質の300x300に置換して使用する。
    let imageUrl = uverTrack.artworkUrl100 || null;
    if (imageUrl) {
        // 例: .../image/thumb/Music115/.../source/100x100bb.jpg -> 300x300bb.jpg
        imageUrl = imageUrl.replace('100x100bb.jpg', '300x300bb.jpg');
    }

    return {
        image_url: imageUrl,
        album_name: uverTrack.collectionName || null,
        music_url: uverTrack.trackViewUrl || null,
    };
}

/**
 * iTunes Search APIでアルバム/シングルを検索し、ジャケット画像URLを返す
 */
async function searchITunesAlbum(albumTitle) {
    const query = encodeURIComponent(`UVERworld ${albumTitle}`);
    // entity=album で検索
    const url = `https://itunes.apple.com/search?term=${query}&country=jp&entity=album&limit=10`;
    
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const results = data.results || [];

    if (results.length === 0) return null;

    // 1. アーティスト名が UVERworld で、かつタイトルが collectionName に含まれるものを優先
    const normalizedTitle = albumTitle.toLowerCase().replace(/[\s\-\~\～]/g, '');
    
    let bestMatch = results.find(a => {
        const name = (a.collectionName || '').toLowerCase().replace(/[\s\-\~\～]/g, '');
        const artist = (a.artistName || '').toLowerCase();
        return artist.includes('uverworld') && 
               (name.includes(normalizedTitle) || normalizedTitle.includes(name));
    });

    // 2. 見つからなければ、単に UVERworld の一番上の結果
    if (!bestMatch) {
        bestMatch = results.find(a => (a.artistName || '').toLowerCase().includes('uverworld'));
    }

    // 3. それでもなければ一番上の結果
    const uverAlbum = bestMatch || results[0];

    let imageUrl = uverAlbum.artworkUrl100 || null;
    if (imageUrl) {
        // 高画質化
        imageUrl = imageUrl.replace('100x100bb.jpg', '600x600bb.jpg');
    }

    return {
        image_url: imageUrl,
        collection_id: uverAlbum.collectionId,
        collection_url: uverAlbum.collectionViewUrl
    };
}

// GET /api/music/song-image/:songTitle - 楽曲のジャケット画像を取得
router.get('/song-image/:songTitle', async (req, res) => {
    try {
        const { songTitle } = req.params;

        // 1. まずDBにキャッシュがあるかチェック
        const cached = await db.query(
            'SELECT image_url FROM songs WHERE REPLACE(LOWER(title), \' \', \'\') = $1 AND image_url IS NOT NULL',
            [songTitle.replace(/\s+/g, '').toLowerCase()]
        );

        if (cached.rows.length > 0 && cached.rows[0].image_url) {
            return res.json({ image_url: cached.rows[0].image_url, source: 'cache' });
        }

        // 2. DBにない場合、iTunes APIから取得
        const result = await searchITunesTrack(songTitle);

        if (!result || !result.image_url) {
            return res.json({ image_url: null, source: 'not_found' });
        }

        // 3. 取得した画像URLをDBにキャッシュ保存
        await db.query(
            `UPDATE songs SET image_url = $1 
             WHERE REPLACE(LOWER(title), ' ', '') = $2`,
            [result.image_url, songTitle.replace(/\s+/g, '').toLowerCase()]
        );

        res.json({
            image_url: result.image_url,
            album_name: result.album_name,
            music_url: result.music_url,
            source: 'itunes',
        });
    } catch (err) {
        console.error('[iTunes] API Error:', err.message);
        res.status(500).json({ message: 'iTunes API Error', error: err.message });
    }
});

// GET /api/music/album-image/:albumTitle - アルバムのジャケット画像を取得
router.get('/album-image/:albumTitle', async (req, res) => {
    try {
        const { albumTitle } = req.params;

        // 1. まず専用のアルバムキャッシュ (album_cache) をチェック
        const cached = await db.query(
            'SELECT image_url FROM album_cache WHERE album_title = $1',
            [albumTitle]
        );

        if (cached.rows.length > 0 && cached.rows[0].image_url) {
            return res.json({ image_url: cached.rows[0].image_url, source: 'cache_v2' });
        }

        // 2. なければ iTunes API からアルバムとして取得 (独自の強化されたマッチングロジックを使用)
        const result = await searchITunesAlbum(albumTitle);

        if (!result || !result.image_url) {
            return res.json({ image_url: null, source: 'not_found' });
        }

        // 3. 取得した画像URLを album_cache に保存
        try {
            await db.query(
                'INSERT INTO album_cache (album_title, image_url, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT (album_title) DO UPDATE SET image_url = $2, updated_at = CURRENT_TIMESTAMP',
                [albumTitle, result.image_url]
            );
        } catch (dbErr) {
            console.warn('[iTunes] Failed to store album image in album_cache:', dbErr.message);
        }

        res.json({
            image_url: result.image_url,
            source: 'itunes_album'
        });
    } catch (err) {
        console.error('[iTunes] Album API Error:', err.message);
        res.status(500).json({ message: 'iTunes Album API Error', error: err.message });
    }
});

// GET /api/music/batch - 複数の楽曲の画像を一括取得（セットリスト表示用）
router.get('/batch', async (req, res) => {
    try {
        const { titles } = req.query; // カンマ区切りの曲名
        if (!titles) {
            return res.status(400).json({ message: 'titles パラメータが必要です' });
        }

        const songTitles = titles.split(',').map(t => t.trim());
        const results = {};

        for (const title of songTitles) {
            const normalizedTitle = title.replace(/\s+/g, '').toLowerCase();

            // DBキャッシュを確認
            const cached = await db.query(
                'SELECT title, image_url FROM songs WHERE REPLACE(LOWER(title), \' \', \'\') = $1 AND image_url IS NOT NULL',
                [normalizedTitle]
            );

            if (cached.rows.length > 0 && cached.rows[0].image_url) {
                results[title] = { image_url: cached.rows[0].image_url, source: 'cache' };
                continue;
            }

            // iTunes APIから取得
            try {
                const result = await searchITunesTrack(title);
                if (result && result.image_url) {
                    // DBにキャッシュ
                    await db.query(
                        `UPDATE songs SET image_url = $1 
                         WHERE REPLACE(LOWER(title), ' ', '') = $2`,
                        [result.image_url, normalizedTitle]
                    );
                    results[title] = { image_url: result.image_url, source: 'itunes' };
                } else {
                    results[title] = { image_url: null, source: 'not_found' };
                }
            } catch (apiErr) {
                console.error(`[iTunes] "${title}" の取得に失敗:`, apiErr.message);
                results[title] = { image_url: null, source: 'error' };
            }

            // iTunes APIのレート制限対策: 1秒約20回制限なので、安全のため200ms間隔を空ける
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        res.json(results);
    } catch (err) {
        console.error('[iTunes] Batch API Error:', err.message);
        res.status(500).json({ message: 'iTunes Batch API Error', error: err.message });
    }
});

module.exports = router;
