const db = require('../db');
const { effectiveLiveMetadata } = require('./liveMetadataProjection');

/** 一括取得し、公開してよい有効情報だけを返す。原文・候補・メモは出力しない。 */
async function attachPublicLiveMetadata(lives) {
    if (!lives.length) return [];
    const ids = [...new Set(lives.map(live => Number(live.id)))];
    const result = await db.query(
        'SELECT live_id, candidates, overrides FROM live_metadata WHERE live_id = ANY($1::int[])', [ids],
    );
    const saved = new Map(result.rows.map(row => [Number(row.live_id), row]));
    const artistIds = [...new Set(result.rows.flatMap(row => row.overrides.participants?.items?.map(item => item.artistId) || []))];
    const artists = artistIds.length ? await db.query('SELECT id, name, aliases FROM live_artists WHERE id = ANY($1::int[])', [artistIds]) : { rows: [] };
    const names = new Map(artists.rows.map(artist => [Number(artist.id), artist]));
    return lives.map(live => {
        const row = saved.get(Number(live.id));
        const effective = effectiveLiveMetadata(live, row?.candidates || {}, row?.overrides || {});
        return {
            ...live,
            tags: effective.tags,
            metadata: {
                country: effective.country,
                members: effective.members,
                participants: { status: effective.participants.status, items: effective.participants.items.map(item => {
                    const artist = names.get(item.artistId);
                    if (!artist) throw new Error('Artist dictionary entry missing');
                    return { artistId: item.artistId, role: item.role, name: artist.name, aliases: artist.aliases };
                }) },
            },
        };
    });
}

module.exports = { attachPublicLiveMetadata };
