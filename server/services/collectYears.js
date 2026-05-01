const axios = require('axios');
const db = require('../db');
const { getJob, updateJob } = require('./collectJob');
const { normalizeVenueName, normalizeSongTitle: translateSongTitle } = require('../utils/songTranslations');

// DB の normalized_title カラム用キー（小文字 + 空白正規化）
function makeNormalizedKey(title) {
    return (title || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function logToDb(level, message, details = null) {
    try {
        await db.query(
            'INSERT INTO collector_logs (level, message, details) VALUES ($1, $2, $3)',
            [level, message, details ? JSON.stringify(details) : null]
        );
    } catch (e) {
        console.error('[collectYears logToDb error]', e.message);
    }
}

async function fetchPage(year, page, apiKey) {
    const res = await axios.get('https://api.setlist.fm/rest/1.0/search/setlists', {
        params: { artistName: 'UVERworld', year, p: page },
        headers: { 'x-api-key': apiKey, Accept: 'application/json' },
        timeout: 15000,
    });
    return res.data;
}

function detectLiveType(venueName) {
    const v = (venueName || '').toLowerCase();
    if (v.includes('dome') || v.includes('ドーム')) return 'ARENA';
    if (v.includes('arena') || v.includes('アリーナ') || v.includes('メッセ') || v.includes('messe') || v.includes('budokan') || v.includes('武道館') || v.includes('garden theater') || v.includes('ガーデンシアター')) return 'ARENA';
    if (v.includes('zepp') || v.includes('hatch') || v.includes('ハッチ') || v.includes('blitz') || v.includes('studio coast') || v.includes('liquidroom') || v.includes('quattro') || v.includes('o-east') || v.includes('o-west')) return 'LIVEHOUSE';
    if (v.includes('hall') || v.includes('ホール') || v.includes('kaikan') || v.includes('会館') || v.includes('budokan') || v.includes('theater') || v.includes('theatre') || v.includes('シアター')) return 'HALL';
    return 'ONEMAN';
}

async function upsertLive(client, setlist, setlistStatus) {
    const parts = setlist.eventDate.split('-'); // DD-MM-YYYY
    const dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
    const rawVenue = setlist.venue?.name || '';
    const venue = normalizeVenueName(rawVenue);
    const tourName = setlist.tour?.name || setlist.info || '';
    const sfmId = setlist.id;
    const liveType = detectLiveType(rawVenue);

    const result = await client.query(`
        INSERT INTO lives (date, venue, tour_name, type, setlistfm_id, setlist_status)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (setlistfm_id) WHERE setlistfm_id IS NOT NULL DO NOTHING
        RETURNING id
    `, [dateStr, venue, tourName, liveType, sfmId, setlistStatus]);

    return result.rows[0]?.id || null;
}

async function upsertSong(client, rawTitle) {
    // Setlist.fm のロマ字/英語タイトルを正式タイトルに変換
    const title = translateSongTitle(rawTitle) || rawTitle;
    const normalizedTitle = makeNormalizedKey(title);

    const existing = await client.query(
        'SELECT id FROM songs WHERE normalized_title = $1 LIMIT 1',
        [normalizedTitle]
    );
    if (existing.rows.length) return existing.rows[0].id;

    const result = await client.query(`
        INSERT INTO songs (title, normalized_title)
        VALUES ($1, $2)
        ON CONFLICT (title) DO UPDATE SET normalized_title = EXCLUDED.normalized_title
        RETURNING id
    `, [title, normalizedTitle]);
    return result.rows[0].id;
}

async function collectYear(year, apiKey, jobId) {
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
        updateJob(jobId, { currentYear: year, currentPage: page });

        let data;
        let retries = 0;
        while (true) {
            try {
                data = await fetchPage(year, page, apiKey);
                break;
            } catch (err) {
                if (err.response?.status === 429 && retries < 3) {
                    retries++;
                    const wait = 5000 * retries;
                    console.log(`[collectYears] 429 rate limit - waiting ${wait}ms`);
                    await sleep(wait);
                    continue;
                }
                throw err;
            }
        }

        totalPages = Math.ceil((data.total || 0) / (data.itemsPerPage || 20));
        const setlists = data.setlist || [];

        for (const setlist of setlists) {
            const client = await db.pool.connect();
            try {
                await client.query('BEGIN');

                const flatSongs = (setlist.sets?.set || []).flatMap(s => s.song || []).filter(s => s.name);
                const setlistStatus = flatSongs.length === 0 ? 'UNKNOWN_SETLIST' : 'NORMAL';

                const liveId = await upsertLive(client, setlist, setlistStatus);
                if (!liveId) {
                    await client.query('COMMIT');
                    const job = getJob(jobId);
                    updateJob(jobId, { totalSkipped: (job?.totalSkipped || 0) + 1 });
                    continue;
                }

                for (let i = 0; i < flatSongs.length; i++) {
                    const songId = await upsertSong(client, flatSongs[i].name);
                    await client.query(
                        'INSERT INTO setlists (live_id, song_id, position) VALUES ($1, $2, $3)',
                        [liveId, songId, i + 1]
                    );
                }

                await client.query('COMMIT');
                const job = getJob(jobId);
                updateJob(jobId, { totalCreated: (job?.totalCreated || 0) + 1 });
            } catch (err) {
                await client.query('ROLLBACK');
                const job = getJob(jobId);
                updateJob(jobId, { totalFailed: (job?.totalFailed || 0) + 1 });
                await logToDb('error', `${year}年収集エラー: ${err.message}`, { setlistId: setlist.id });
                console.error(`[collectYears] ${year} setlist ${setlist.id} error:`, err.message);
            } finally {
                client.release();
            }
        }

        if (page < totalPages) {
            await sleep(1200);
            page++;
        } else {
            break;
        }
    }

    const job = getJob(jobId);
    await logToDb('info', `${year}年収集完了`, {
        created: job?.totalCreated,
        skipped: job?.totalSkipped,
        failed: job?.totalFailed,
    });
}

async function collectYears(yearStart, yearEnd, apiKey, jobId) {
    try {
        await logToDb('info', `一括収集開始: ${yearStart}〜${yearEnd}年`, { jobId });
        for (let year = yearStart; year <= yearEnd; year++) {
            await collectYear(year, apiKey, jobId);
        }
        const job = getJob(jobId);
        await logToDb('info', '一括収集完了', {
            created: job?.totalCreated,
            skipped: job?.totalSkipped,
            failed: job?.totalFailed,
        });
        updateJob(jobId, { status: 'done', finishedAt: new Date().toISOString() });
    } catch (err) {
        updateJob(jobId, { status: 'error', error: err.message, finishedAt: new Date().toISOString() });
        await logToDb('error', `一括収集エラー: ${err.message}`, { jobId });
        console.error('[collectYears] Fatal error:', err.message);
    }
}

module.exports = { collectYears };
