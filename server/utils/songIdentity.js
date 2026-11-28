const { normalizeSongTitle } = require('./songTranslations');

// Only the reviewed ROSIER / LUNA SEA cover spelling family is equivalent.
// Never remove artist, version or guest annotations to construct an identity.
function songIdentity(title) {
    const typography = String(title || '').replace(/（/g, '(').replace(/）/g, ')')
        .toLowerCase().replace(/\s+/g, ' ').trim().replace(/\s*\(\s*/g, '(').replace(/\s*\)\s*/g, ')');
    return typography === 'rosier(luna sea cover)' ? 'cover:rosier:luna-sea' : `title:${title}`;
}

function registrationTitle(rawTitle, translate = true) {
    if (typeof rawTitle !== 'string' || !rawTitle.trim() || rawTitle.length > 255) {
        throw identityError('Invalid song title', 400);
    }
    const title = rawTitle.trim();
    // The legacy dictionary includes mappings that drop an acoustic/version suffix.
    // Preserve annotated input rather than treating a distinct version as an alias.
    return !translate || /[()（）]/.test(title) ? title : normalizeSongTitle(title);
}

function identityError(message = 'Song identity requires administrator review', status = 409) {
    return Object.assign(new Error(message), { songIdentityStatus: status });
}

async function lockSongRegistration(client) {
    // All creation/edit/restore paths share a transaction-level lock. A second
    // statement after the lock sees the committed predecessor at READ COMMITTED.
    await client.query('SELECT pg_advisory_xact_lock(273, 1)');
}

async function findSong(client, title, excludeId = null, reviewUncertain = true) {
    const result = await client.query('SELECT * FROM songs ORDER BY id');
    const matches = result.rows.filter(song => String(song.id) !== String(excludeId)
        && songIdentity(song.title) === songIdentity(title));
    const active = matches.filter(song => !song.deleted_at);
    const exact = active.find(song => song.title === title);
    if (exact) return exact;
    if (active.length === 1) return active[0];
    if (matches.length) throw identityError(); // ambiguous or soft-deleted: do not guess/restore
    // Legacy importers folded case/whitespace (drafts even removed all spaces).
    // Do not regress to creating these duplicates, but do not auto-merge an
    // unreviewed same-name/version/artist family either: require an explicit ID.
    const reviewKey = value => String(value).replace(/（/g, '(').replace(/）/g, ')').toLowerCase().replace(/\s+/g, '');
    const translated = normalizeSongTitle(title);
    const uncertain = result.rows.some(song => String(song.id) !== String(excludeId)
        && (reviewKey(song.title) === reviewKey(title)
            || (/[()（）]/.test(title) && translated !== title && reviewKey(song.title) === reviewKey(translated))));
    if (uncertain && reviewUncertain) throw identityError();
    return null;
}

// Caller owns BEGIN/COMMIT/ROLLBACK on this same checked-out client.
async function resolveSong(client, rawTitle, translate = false) {
    const raw = registrationTitle(rawTitle, false);
    const title = registrationTitle(rawTitle, translate);
    await lockSongRegistration(client);
    // Keep existing exact IDs even when a legacy translation alias also exists.
    const exact = await findSong(client, raw, null, raw === title);
    const existing = exact || (raw !== title ? await findSong(client, title) : null);
    if (existing) return { song: existing, created: false };
    const normalizedTitle = title.toLowerCase().replace(/\s+/g, ' ').trim();
    const result = await client.query('INSERT INTO songs (title, normalized_title) VALUES ($1, $2) RETURNING *', [title, normalizedTitle]);
    return { song: result.rows[0], created: true };
}

module.exports = { songIdentity, registrationTitle, identityError, lockSongRegistration, findSong, resolveSong };
