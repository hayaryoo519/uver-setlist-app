const crypto = require('crypto');
const db = require('../db');

const APP_URL = process.env.APP_URL || 'https://uver-setlist-archive.org';

function jstDateParts(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(now);
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return { date: `${values.year}-${values.month}-${values.day}`, monthDay: `${values.month}-${values.day}` };
}

function buildOnThisDay(live, songs, today) {
    const years = Number(today.slice(0, 4)) - Number(live.date.slice(0, 4));
    const lines = songs.slice(0, 8).map((song, index) => `${index + 1}. ${song.title}`).join('\n');
    return `【今日は${years}年前】\n${live.date.replaceAll('-', '/')}、UVERworldは\n${live.venue}でライブを開催しました🎸\n\n📋 その日のセトリ（全${songs.length}曲）\n${lines}${songs.length > 8 ? '\n… 続きはこちら👇' : ''}\n${APP_URL}/live/${live.id}\n\n#UVERworld #OnThisDay`;
}

async function createOnThisDayDraft({ now = new Date(), createdBy = null } = {}) {
    const { date, monthDay } = jstDateParts(now);
    const liveResult = await db.query(
        `SELECT l.id, l.date::text AS date, l.venue
         FROM lives l
         WHERE TO_CHAR(l.date, 'MM-DD') = $1 AND l.date < $2::date
           AND (l.setlist_status = 'NORMAL' OR EXISTS (SELECT 1 FROM setlists s WHERE s.live_id = l.id))
         ORDER BY l.date DESC LIMIT 1`,
        [monthDay, date]
    );
    if (!liveResult.rows.length) return null;

    const live = liveResult.rows[0];
    const songs = await db.query(
        'SELECT s.title FROM setlists sl JOIN songs s ON s.id = sl.song_id WHERE sl.live_id = $1 ORDER BY sl.position',
        [live.id]
    );
    const body = buildOnThisDay(live, songs.rows, date).slice(0, 280);
    const key = crypto.createHash('sha256').update(`x:on_this_day:${date}`).digest('hex');
    const result = await db.query(
        `INSERT INTO social_posts (platform, post_type, live_id, body, idempotency_key, created_by)
         VALUES ('x', 'on_this_day', $1, $2, $3, $4)
         ON CONFLICT (idempotency_key) DO NOTHING
         RETURNING *`,
        [live.id, body, key, createdBy]
    );
    return result.rows[0] || null;
}

async function runDailyDraftGeneration() {
    try {
        const draft = await createOnThisDayDraft();
        console.log(draft ? `[SocialPosts] Created On This Day draft #${draft.id}` : '[SocialPosts] No new On This Day draft');
    } catch (err) {
        console.error('[SocialPosts] Daily draft generation failed:', err.message);
    }
}

function startDailyDraftGeneration(intervalMs = 24 * 60 * 60 * 1000) {
    runDailyDraftGeneration();
    return setInterval(runDailyDraftGeneration, intervalMs);
}

module.exports = { buildOnThisDay, createOnThisDayDraft, runDailyDraftGeneration, startDailyDraftGeneration, jstDateParts };
