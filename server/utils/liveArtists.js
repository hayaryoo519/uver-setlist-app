const ROLES = ['co_headliner', 'guest', 'supporting_act'];
function bad(message) { const error = new Error(message); error.statusCode = 400; throw error; }
const normalizeArtistName = value => value.normalize('NFKC').toLowerCase().trim().replace(/\s+/g, ' ');
function validName(value) {
    if (typeof value !== 'string' || !value.trim() || value.length > 200) bad('Artist name must be 1–200 characters');
    return value.trim().replace(/\s+/g, ' ');
}
function validateArtist(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['name', 'aliases', 'revision'].includes(key))) bad('Invalid artist');
    const name = validName(body.name);
    if (normalizeArtistName(name).length > 200) bad('Normalized artist name exceeds 200 characters');
    if (!Array.isArray(body.aliases) || body.aliases.length > 30) bad('Invalid artist aliases');
    const aliases = []; const seen = new Set([normalizeArtistName(name)]);
    for (const value of body.aliases) {
        const alias = validName(value); const key = normalizeArtistName(alias);
        if (!seen.has(key)) { aliases.push(alias); seen.add(key); }
    }
    return { name, normalizedName: normalizeArtistName(name), aliases, normalizedAliases: aliases.map(normalizeArtistName) };
}
function validateParticipants(setting) {
    if (!setting || typeof setting !== 'object' || Array.isArray(setting) || Object.keys(setting).some(key => key !== 'items') || !Array.isArray(setting.items) || setting.items.length > 30) bad('Invalid participants');
    const seen = new Set();
    const items = setting.items.map(item => {
        if (!item || typeof item !== 'object' || Array.isArray(item) || Object.keys(item).some(key => !['artistId', 'role'].includes(key)) ||
            !Number.isInteger(item.artistId) || item.artistId < 1 || item.artistId > 2147483647 || !ROLES.includes(item.role)) bad('Invalid participant');
        const key = `${item.artistId}:${item.role}`;
        if (seen.has(key)) bad('Duplicate artist and role');
        seen.add(key);
        return { artistId: item.artistId, role: item.role };
    });
    return { items };
}
module.exports = { normalizeArtistName, validateArtist, validateParticipants };
